import { join } from "path";
import { existsSync, ensureDirSync, outputFileSync, readFileSync, rmSync } from "fs-extra";
import lockfile from "proper-lockfile";
import Database from "better-sqlite3";
import {
  createJazzContextForNewAccount,
  createJazzContextFromExistingCredentials,
  MockSessionProvider,
  Group,
  type Account,
} from "jazz-tools";
// cojson does not expose its storage adapters through its public `exports`
// map; we reach into the published `./dist/*` wildcard with an explicit
// `/index.js` so node's exports resolver matches a real file path.
import { getSqliteStorage } from "cojson/dist/storage/sqlite/index.js";
import type { SQLiteDatabaseDriver } from "cojson/dist/storage/sqlite/index.js";
import type { Peer } from "cojson";
// Same reason as the `cojson/dist/*` storage imports above: the crypto
// adapter isn't in cojson's public `exports` map, so reach into the
// published `./dist/*` path with an explicit `.js` so node's exports
// resolver (and tsc under the current moduleResolution) matches a real file.
import { WasmCrypto } from "cojson/dist/crypto/WasmCrypto.js";
import { WebSocketPeerWithReconnection } from "cojson-transport-ws";
import WebSocket from "ws";
import { logger as cojsonLogger, LogLevel as CojsonLogLevel } from "cojson";
import { recordEntry as recordSyncLog } from "./jazzLogBuffer";

// Crank up cojson's internal log level when the user opts in. Useful
// for diagnosing sync failures: at DEBUG you see every peer (dis)connect,
// every outgoing/incoming sync message, and every CoValue load. Set
// `KLIPPEL_JAZZ_DEBUG=1` (or `=debug`) in launch.json / shell env.
const jazzDebugRaw = (process.env.KLIPPEL_JAZZ_DEBUG ?? "").toLowerCase();
if (jazzDebugRaw && jazzDebugRaw !== "0" && jazzDebugRaw !== "false") {
  const level =
    jazzDebugRaw === "info"
      ? CojsonLogLevel.INFO
      : jazzDebugRaw === "warn"
      ? CojsonLogLevel.WARN
      : CojsonLogLevel.DEBUG;
  cojsonLogger.setLevel(level);
  const levelName =
    level === CojsonLogLevel.DEBUG
      ? "DEBUG"
      : level === CojsonLogLevel.INFO
      ? "INFO"
      : "WARN";
  console.log(
    `[jazz] cojson log level → ${levelName} (KLIPPEL_JAZZ_DEBUG=${jazzDebugRaw})`,
  );
}
import {
  KlippelAccount,
  ModelsMap,
  ModelSummariesMap,
  WorkspaceCoMap,
  WorkspaceMetadata,
} from "../../src/kernel/modules/Store/schema";
import { reattachSync } from "./db";
import { syncStatus, type SyncStatus } from "./sync";
import { getAbsPath } from "./storage";
import {
  upsertWorkspace,
  findWorkspace,
  readWorkspacesIndex,
  removeWorkspace,
  type WorkspaceIndexEntry,
} from "./workspacesIndex";
import { getMainModules } from "./modules";

type Credentials = { accountID: string; accountSecret: string };

type JazzContext = Awaited<ReturnType<typeof createJazzContextForNewAccount>>;

/**
 * Cached, deep-resolved `WorkspaceCoMap` handle scoped to the active
 * workspace. Resolved once at open (or on first access) with
 * `metadata + modelSummaries.$each + models` and reused across every IPC
 * call. Replaces the previous "WorkspaceCoMap.load on every IPC" path
 * (jazz-performance.md §2.2).
 *
 * `models` is resolved as a container only — entries are loaded on demand
 * by `loadModel` via `ModelCoMap.load(modelCoId)` so the cached handle
 * stays bounded by the (lightweight) summary count, not by model bodies.
 */
type LoadedWorkspaceHandle = Awaited<ReturnType<typeof WorkspaceCoMap.load>>;

export type ActiveWorkspace = {
  name: string;
  dir: string;
  coId: string;
  context: JazzContext;
  syncUrl?: string;
  handle: LoadedWorkspaceHandle | null;
  /**
   * Reference to the WebSocket reconnector that backs sync for this
   * workspace, exposed so the diagnostic `jazz-sync-status` IPC can
   * report whether the socket is actually connected. `null` for
   * sync-disabled workspaces.
   */
  syncReconnector?: SyncReconnector | null;
  release: () => Promise<void>;
};

let activeWorkspace: ActiveWorkspace | null = null;

function workspaceDir(name: string): string {
  return getAbsPath(`workspaces/${name}`);
}

/**
 * Validate a peer sync URL before we open a WebSocket to it. Accept ws:// or
 * wss:// only; reject embedded userinfo so a malicious invite cannot exfil
 * credentials in the URL. The harness and the Share UI both rely on this —
 * the renderer can also re-validate before saving, but main-process is the
 * authoritative boundary.
 */
function isValidSyncUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") return false;
    if (parsed.username || parsed.password) return false;
    return true;
  } catch {
    return false;
  }
}

function resolveSyncUrl(
  indexEntry: WorkspaceIndexEntry | undefined,
  envOverride: string | undefined,
): string | undefined {
  const candidate = envOverride ?? indexEntry?.syncUrl;
  if (!candidate) return undefined;
  if (!isValidSyncUrl(candidate)) {
    console.error("[jazz] rejecting invalid sync URL", candidate);
    return undefined;
  }
  return candidate;
}

type SyncReconnector = {
  enable: () => void;
  disable: () => void;
  waitUntilConnected: () => Promise<void>;
};

/**
 * Construct the WebSocket-peer reconnector used to keep the local Jazz
 * node attached to a sync server. Matches the pattern jazz-tools uses
 * in its own SSR helper: the reconnector handles the WS open/close
 * lifecycle and calls `addPeer` on the sync manager when the socket is
 * ready. We pass `WebSocket` from the `ws` package so this works on the
 * node side; browser builds use the global.
 */
function createSyncReconnector(
  url: string,
  node: {
    syncManager: {
      addPeer: (peer: Peer) => void;
      peers?: Record<string, unknown>;
    };
  },
): SyncReconnector {
  return new WebSocketPeerWithReconnection({
    peer: url,
    reconnectionTimeout: 500,
    addPeer: (peer) => {
      node.syncManager.addPeer(peer);
    },
    removePeer: () => {
      // `WebSocketPeerWithReconnection` reports the disconnect; cojson's
      // sync manager already cleans up its end via the peer's `outgoing`
      // close handler, so there is nothing for us to do here.
    },
    WebSocketConstructor:
      WebSocket as unknown as ConstructorParameters<
        typeof WebSocketPeerWithReconnection
      >[0]["WebSocketConstructor"],
  });
}

function applyPragmas(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.pragma("mmap_size = 268435456");
  db.pragma("cache_size = -65536");
  db.pragma("wal_autocheckpoint = 1000");
}

function makeDriver(db: Database.Database): SQLiteDatabaseDriver {
  return {
    run(sql, params) {
      db.prepare(sql).run(...(params as unknown[]));
    },
    get<T>(sql: string, params: unknown[]) {
      return db.prepare(sql).get(...(params as unknown[])) as T | undefined;
    },
    query<T>(sql: string, params: unknown[]) {
      return db.prepare(sql).all(...(params as unknown[])) as T[];
    },
    transaction(callback) {
      db.transaction(callback)();
    },
    closeDb() {
      db.close();
    },
  };
}

function readCredentials(dir: string): Credentials | null {
  const credsPath = join(dir, ".account-creds.json");
  if (!existsSync(credsPath)) return null;
  try {
    return JSON.parse(readFileSync(credsPath, { encoding: "utf-8" }));
  } catch {
    return null;
  }
}

function writeCredentials(dir: string, creds: Credentials): void {
  outputFileSync(join(dir, ".account-creds.json"), JSON.stringify(creds));
}

/**
 * Acquire the per-workspace `.db.lock` and tolerate stale lock directories
 * left behind when a previous main process exited without running its
 * `before-quit` async cleanup (most commonly during electron-vite hot
 * reloads). On `ELOCKED`, force-remove the lock directory and retry once —
 * if there is a genuine concurrent holder, the second attempt will still
 * race them and the loser sees their own lock vanish, which is the same
 * failure mode as today.
 */
async function acquireDbLock(lockPath: string): Promise<() => Promise<void>> {
  // `onCompromised` swallows the watchdog's stat error. proper-lockfile spawns
  // a setInterval (driven by `stale`) that re-stats `${lockPath}.lock` to
  // refresh mtime; if the workspace dir is wiped externally (e2e
  // `resetWorkspace`, manual cleanup, hot-reload between tests), the next tick
  // hits ENOENT and the default handler throws synchronously inside the timer
  // — escaping every try/catch and bubbling up as an uncaught main-process
  // exception. We don't care: the workspace is being torn down anyway.
  const options = {
    retries: 0,
    stale: 30_000,
    onCompromised: (err: Error & { code?: string }) => {
      if (err.code !== "ENOENT") {
        console.error("[jazz] lock watchdog compromised", err);
      }
    },
  };
  try {
    return await lockfile.lock(lockPath, options);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "ELOCKED") throw err;
    const lockDir = `${lockPath}.lock`;
    try {
      rmSync(lockDir, { recursive: true, force: true });
    } catch (rmErr) {
      console.error("[jazz] failed to remove stale lock dir", rmErr);
    }
    return lockfile.lock(lockPath, options);
  }
}

// In-flight open: a second caller asking to open the same workspace while
// the first is still acquiring the lockfile / bootstrapping Jazz waits on
// the same promise instead of force-removing the active lock from under it.
let openingWorkspace: { name: string; promise: Promise<ActiveWorkspace> } | null = null;

export async function openWorkspaceJazzNode(name: string): Promise<ActiveWorkspace> {
  if (activeWorkspace?.name === name) return activeWorkspace;
  if (openingWorkspace?.name === name) return openingWorkspace.promise;

  const promise = openWorkspaceJazzNodeInner(name);
  openingWorkspace = { name, promise };
  try {
    return await promise;
  } finally {
    if (openingWorkspace?.promise === promise) openingWorkspace = null;
  }
}

async function openWorkspaceJazzNodeInner(name: string): Promise<ActiveWorkspace> {
  const dir = workspaceDir(name);
  ensureDirSync(dir);

  const lockPath = join(dir, ".db.lock");
  if (!existsSync(lockPath)) outputFileSync(lockPath, "");
  const releaseLock = await acquireDbLock(lockPath);

  const dbPath = join(dir, "jazz.sqlite");
  const db = new Database(dbPath);
  applyPragmas(db);
  const storage = getSqliteStorage(makeDriver(db));

  const crypto = await WasmCrypto.create();
  const existing = readCredentials(dir);

  // Resolve sync URL. Env var wins (e2e harness, dev script), else the
  // index entry's `syncUrl`. We wire the WS peer *after* context creation
  // — `WebSocketPeerWithReconnection.enable()` adds the peer to the
  // sync manager once the socket is OPEN, which is the pattern
  // jazz-tools itself uses (see `createSSRJazzAgent`). The previous
  // approach of passing a half-connected `Peer` in `peers: [...]` left
  // the cojson side waiting forever for an outgoing connection that the
  // raw `new WebSocket(url)` had not finished establishing.
  const indexEntry = findWorkspace(name);
  const envSyncUrl = process.env.KLIPPEL_JAZZ_SYNC_URL;
  const syncUrl =
    indexEntry?.syncOptIn || envSyncUrl
      ? resolveSyncUrl(indexEntry, envSyncUrl)
      : undefined;

  let context: JazzContext;
  if (existing) {
    context = await createJazzContextFromExistingCredentials({
      credentials: {
        accountID: existing.accountID as `co_${string}`,
        secret: existing.accountSecret as `sealerSecret_z${string}/signerSecret_z${string}`,
      },
      AccountSchema: KlippelAccount,
      sessionProvider: new MockSessionProvider(),
      peers: [],
      crypto,
      asActiveAccount: true,
      storage,
    });
  } else {
    context = await createJazzContextForNewAccount({
      creationProps: { name: `Klippel Device — ${name}` },
      AccountSchema: KlippelAccount,
      sessionProvider: new MockSessionProvider(),
      peers: [],
      crypto,
      storage,
    });
    const account = context.account as unknown as { $jazz: { id: string } };
    writeCredentials(dir, {
      accountID: account.$jazz.id,
      accountSecret: context.node.agentSecret,
    });
  }

  recordSyncLog("info", `[workspace] opened "${name}"`, {
    dir,
    syncUrl: syncUrl ?? null,
  });

  // Now that the context exists, wire the sync reconnector and wait for
  // the socket to open so the very next `WorkspaceCoMap.load` finds a
  // live peer instead of an empty sync manager.
  let syncReconnector: SyncReconnector | null = null;
  if (syncUrl) {
    recordSyncLog("info", `[sync] connecting to ${syncUrl}`);
    syncReconnector = createSyncReconnector(syncUrl, context.node as unknown as {
      syncManager: { addPeer: (peer: Peer) => void; peers?: Record<string, unknown> };
    });
    syncReconnector.enable();
    try {
      await syncReconnector.waitUntilConnected();
    } catch (err) {
      console.error("[jazz] sync waitUntilConnected failed", err);
    }
  }

  const jazzIdPath = join(dir, ".jazz-id");
  const coId = existsSync(jazzIdPath)
    ? readFileSync(jazzIdPath, { encoding: "utf-8" }).trim()
    : "";

  activeWorkspace = {
    name,
    dir,
    coId,
    context,
    syncUrl,
    handle: null,
    syncReconnector,
    release: async () => {
      // `context.done()` fires `node.gracefulShutdown()` but does NOT await
      // it, so a follow-up close that races pending storage writes hits
      // "The database connection is not open" inside cojson's local
      // transactions queue. Drive `gracefulShutdown` directly and await it
      // — it drains queues, flushes pending writes, and closes the storage
      // adapter (which closes the better-sqlite3 handle our driver owns).
      try {
        await (context.node as unknown as { gracefulShutdown: () => Promise<unknown> })
          .gracefulShutdown();
      } catch (err) {
        console.error("[jazz] node.gracefulShutdown failed", err);
      }
      if (syncReconnector) {
        try {
          syncReconnector.disable();
        } catch (err) {
          console.error("[jazz] sync reconnector disable failed", err);
        }
      }
      // After gracefulShutdown the DB is normally closed. The pragma path
      // is kept best-effort so the jazz-foundation test still observes a
      // truncated WAL when the storage adapter happens to leave the
      // handle open (older cojson builds).
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
      } catch {
        /* DB already closed by gracefulShutdown — expected */
      }
      try {
        db.close();
      } catch {
        /* already closed by cojson */
      }
      try {
        await releaseLock();
      } catch (err) {
        // `ERELEASED` is benign — happens when the workspace dir (and its
        // lock files) was wiped externally between acquire and release
        // (e2e `resetWorkspace` is the common trigger).
        const code = (err as { code?: string }).code;
        if (code !== "ERELEASED") {
          console.error("[jazz] failed to release lock", err);
        }
      }
    },
  };

  // Connect the SQLite peer as part of opening the workspace, not lazily on
  // the first catalog read. A shared workspace that is merely *open* must
  // already be receiving other people's changes: waiting for a read means a
  // peer sitting on a screen that reads nothing stays silently offline, and —
  // worse — answers no one else's catch-up either.
  reattachSync(name);

  return activeWorkspace!;
}

/**
 * Resolve (and cache) the active workspace's `WorkspaceCoMap` handle.
 *
 * The resolve set is built by shallow-merging `{ metadata: true }` (always)
 * with each registered module's `workspaceResolve()`. Modules own disjoint
 * top-level fields today (Composer: `models` / `modelSummaries`;
 * Materials: `materials`), so a one-level spread is sufficient.
 *
 * After the load resolves, each module's `onWorkspaceLoaded` hook runs
 * (in parallel) before the handle is cached — currently used by Composer
 * to backfill `modelSummaries` for pre-lazy-hydration workspaces.
 */
export async function requireActiveWorkspaceHandle(): Promise<LoadedWorkspaceHandle> {
  if (!activeWorkspace) throw new Error("No active workspace");
  if (!activeWorkspace.coId) throw new Error("Active workspace has no coId");
  if (activeWorkspace.handle) return activeWorkspace.handle;

  const resolve: Record<string, unknown> = { metadata: true };
  for (const m of getMainModules()) {
    if (m.workspaceResolve) Object.assign(resolve, m.workspaceResolve());
  }

  const settled = await WorkspaceCoMap.load(activeWorkspace.coId, {
    resolve: resolve as never,
  });
  if (!settled || ("$isLoaded" in settled && settled.$isLoaded === false)) {
    throw new Error(`Could not load workspace ${activeWorkspace.coId}`);
  }
  await Promise.all(
    getMainModules().map(async (m) => {
      if (!m.onWorkspaceLoaded) return;
      try {
        await m.onWorkspaceLoaded(settled);
      } catch (err) {
        console.error(`[jazz] ${m.name}.onWorkspaceLoaded failed`, err);
      }
    }),
  );
  activeWorkspace.handle = settled;
  return settled;
}

/**
 * Drop the cached `WorkspaceCoMap` handle so the next
 * `requireActiveWorkspaceHandle` rebuilds the resolved view from
 * scratch. Call this after mutating a shallow-resolved ref on the
 * workspace (e.g. `workspace.$jazz.set("materials", …)`) — the cached
 * handle's `$jazz.refs.<field>` accessor was captured at resolve time
 * and does not reflect refs written afterwards, so subsequent reads
 * through the cached handle see a stale `undefined` and re-create the
 * field, wiping data.
 */
export function invalidateActiveWorkspaceHandle(): void {
  if (activeWorkspace) activeWorkspace.handle = null;
}

/**
 * Build the deep-resolve set used by `joinJazzWorkspace` and
 * `enableJazzWorkspaceSync` to preload CoValues into the local node
 * so cojson's sync manager can gossip them to peers. Shallow-merges
 * `{ metadata: true }` with each module's `syncPreloadResolve()` —
 * Composer contributes `modelSummaries`, Materials contributes the
 * deep `materials` tree (shared with `requireCatalog`).
 */
function buildSyncPreloadResolve(): Record<string, unknown> {
  const resolve: Record<string, unknown> = { metadata: true };
  for (const m of getMainModules()) {
    if (m.syncPreloadResolve) Object.assign(resolve, m.syncPreloadResolve());
  }
  return resolve;
}

export async function closeActiveWorkspace(): Promise<void> {
  if (!activeWorkspace) return;
  const ws = activeWorkspace;
  activeWorkspace = null;
  ws.handle = null;
  // Close hooks run sequentially: each module may detach live CoValue
  // subscriptions, and the unsubscribe must complete before the Jazz
  // node's storage adapter closes underneath them (otherwise an
  // unsubscribe races a closed sqlite handle and throws).
  for (const m of getMainModules()) {
    if (!m.onWorkspaceClose) continue;
    try {
      await m.onWorkspaceClose();
    } catch (err) {
      console.error(`[jazz] ${m.name}.onWorkspaceClose failed`, err);
    }
  }
  await ws.release();
}

export function getActiveWorkspace(): ActiveWorkspace | null {
  return activeWorkspace;
}

export type JazzSyncStatus = {
  workspaceName: string | null;
  workspaceCoId: string | null;
  /** Resolved sync URL the reconnector dials; `null` when offline. */
  syncUrl: string | null;
  /** `syncOptIn` flag from the workspace's local index entry. */
  syncOptIn: boolean;
  /** Peer ids currently registered on cojson's sync manager. */
  peers: string[];
  /** True iff a peer matching `syncUrl` is in the registered set. */
  connected: boolean;
  /** Cojson account id for this peer. */
  accountId: string | null;
  /**
   * The cr-sqlite peer — where the catalog and models actually replicate.
   *
   * Separate from the fields above, which describe cojson: the two carry
   * different data through different servers, and during the migration either
   * can be up while the other is down.
   */
  relay: SyncStatus;
};

/**
 * Snapshot of the local node's sync surface. Designed to be called
 * from DevTools (`await window.electron.jazz.syncStatus()`) to
 * diagnose "my edits aren't reaching the other peer" — checks each
 * piece in turn: do we have a workspace, is sync enabled in the
 * index, is the WS peer actually registered.
 */
export async function getSyncStatus(): Promise<JazzSyncStatus> {
  const ws = activeWorkspace;
  if (!ws) {
    return {
      workspaceName: null,
      workspaceCoId: null,
      syncUrl: null,
      syncOptIn: false,
      peers: [],
      connected: false,
      accountId: null,
      relay: syncStatus(),
    };
  }
  const entry = findWorkspace(ws.name);
  const node = ws.context.node as unknown as {
    syncManager?: { peers?: Record<string, unknown> };
  };
  const peers = Object.keys(node.syncManager?.peers ?? {});
  const connected = ws.syncUrl ? peers.some((id) => id.includes(ws.syncUrl!)) : false;
  const account = ws.context.account as unknown as { $jazz?: { id?: string } };
  return {
    workspaceName: ws.name,
    workspaceCoId: ws.coId || null,
    syncUrl: ws.syncUrl ?? null,
    syncOptIn: !!entry?.syncOptIn,
    peers,
    connected,
    accountId: account?.$jazz?.id ?? null,
    relay: syncStatus(),
  };
}

export async function createJazzWorkspace(name: string): Promise<WorkspaceIndexEntry> {
  if (findWorkspace(name)) {
    throw new Error(`Workspace "${name}" already exists`);
  }
  if (activeWorkspace) await closeActiveWorkspace();
  const ws = await openWorkspaceJazzNode(name);

  const account = ws.context.account as unknown as Account & { $jazz: { id: string } };

  const group = Group.create();
  const metadata = WorkspaceMetadata.create(
    {
      name,
      createdAt: Date.now(),
      ownerAccountId: account.$jazz.id,
      syncOptIn: false,
      disallowRelay: true,
    },
    group,
  );
  const models = ModelsMap.create({}, group);
  const modelSummaries = ModelSummariesMap.create({}, group);
  const workspace = WorkspaceCoMap.create({ metadata, models, modelSummaries }, group);
  const coId = workspace.$jazz.id;

  outputFileSync(join(ws.dir, ".jazz-id"), coId);
  ws.coId = coId;

  const entry: WorkspaceIndexEntry = { name, coId, syncOptIn: false };
  upsertWorkspace(entry);
  return entry;
}

export function listJazzWorkspaces(): WorkspaceIndexEntry[] {
  return readWorkspacesIndex();
}

export type JoinWorkspaceInput = {
  name: string;
  coId: string;
  syncUrl: string;
};

/**
 * Join an existing collaborative workspace by `coId` through a sync server.
 * Creates a local workspace dir, opens a Jazz node with the WebSocket peer
 * wired up, loads the remote `WorkspaceCoMap`, and registers the workspace
 * locally with `syncOptIn: true`. Does not call `WorkspaceCoMap.create` —
 * the CoValue already exists on the originating peer.
 */
export async function joinJazzWorkspace(
  input: JoinWorkspaceInput,
): Promise<WorkspaceIndexEntry> {
  const { name, coId, syncUrl } = input;
  if (!isValidSyncUrl(syncUrl)) {
    throw new Error(`Invalid sync URL: ${syncUrl}`);
  }
  if (findWorkspace(name)) {
    throw new Error(`Workspace "${name}" already exists`);
  }
  if (activeWorkspace) await closeActiveWorkspace();

  // Pre-register so `openWorkspaceJazzNodeInner` reads the sync settings on
  // boot and dials the peer before we try to load the remote workspace.
  const entry: WorkspaceIndexEntry = { name, coId, syncOptIn: true, syncUrl };
  upsertWorkspace(entry);

  // Write `.jazz-id` ahead of context creation so a future reopen sees a
  // valid workspace even if `WorkspaceCoMap.load` is slow on first sync.
  const dir = workspaceDir(name);
  ensureDirSync(dir);
  outputFileSync(join(dir, ".jazz-id"), coId);

  try {
    await openWorkspaceJazzNode(name);
    // Load only the summaries record so the renderer's first `listModels`
    // works without blocking on every full `ModelCoMap` body. The full
    // bodies stream in on demand via `loadModel` (jazz-performance.md
    // §2.2). `$onError: "catch"` per child keeps a slow/unauthorized
    // summary from blocking the whole tree.
    // Joiners must pull the materials catalog from the sync server
    // eagerly — without it, the materials ref is observable on the
    // WorkspaceCoMap but the catalog CoMap itself isn't requested and
    // `requireCatalog`'s subsequent deep load races the sync.
    // `buildSyncPreloadResolve` aggregates each module's contribution
    // (Composer: `modelSummaries`; Materials: deep catalog).
    const loaded = await WorkspaceCoMap.load(coId, {
      resolve: buildSyncPreloadResolve() as never,
    });
    if (!loaded || ("$isLoaded" in loaded && loaded.$isLoaded === false)) {
      throw new Error(`Could not load remote workspace ${coId} via ${syncUrl}`);
    }
  } catch (err) {
    // Bootstrap failed — drop the half-registered entry so retries don't hit
    // the "already exists" guard.
    removeWorkspace(name);
    if (activeWorkspace?.name === name) await closeActiveWorkspace();
    throw err;
  }
  return entry;
}

/**
 * Flip `syncOptIn`/`disallowRelay` on the active workspace's metadata and
 * record the URL on the local index entry. Called by the Share UI and by
 * the e2e harness. Returns the updated entry. Does not reconnect — the
 * peer will be wired on the next `openWorkspaceJazzNode` (i.e. after the
 * next `closeActiveWorkspace` or app restart). Callers that need an
 * immediate connection should `closeActiveWorkspace` + `ensureJazzWorkspace`.
 */
export async function enableJazzWorkspaceSync(
  syncUrl: string,
): Promise<WorkspaceIndexEntry> {
  if (!isValidSyncUrl(syncUrl)) {
    throw new Error(`Invalid sync URL: ${syncUrl}`);
  }
  if (!activeWorkspace?.coId) throw new Error("No active workspace");
  const settled = await WorkspaceCoMap.load(activeWorkspace.coId, {
    resolve: { metadata: true },
  });
  if (!settled || ("$isLoaded" in settled && settled.$isLoaded === false)) {
    throw new Error(`Could not load workspace ${activeWorkspace.coId}`);
  }
  const workspace = settled as {
    metadata: { $jazz: { set: (k: string, v: unknown) => void } };
    $jazz: { owner: Group };
  };
  workspace.metadata.$jazz.set("syncOptIn", true);
  workspace.metadata.$jazz.set("disallowRelay", false);
  workspace.metadata.$jazz.set("syncUrl", syncUrl);
  if (activeWorkspace) activeWorkspace.handle = null;

  // Grant remote peers write access to the workspace group. Models and the
  // models map inherit this group at creation time (see createModel / the
  // initial ModelsMap), so this single addMember unlocks the whole tree
  // for any peer that learns the workspace coId. This is the trust model
  // for v1: knowledge of the coId == collaborator. Tighter ACLs land later.
  const group = workspace.$jazz.owner;
  if (group instanceof Group) {
    group.addMember("everyone", "writer");
  }

  const name = activeWorkspace.name;
  const existing = findWorkspace(name);
  if (!existing) throw new Error(`Workspace "${name}" not in index`);
  const updated: WorkspaceIndexEntry = { ...existing, syncOptIn: true, syncUrl };
  upsertWorkspace(updated);

  // Reopen the workspace so `openWorkspaceJazzNodeInner` dials the
  // WebSocket peer. The node takes `peers` at creation time; without the
  // reopen, the local CoValues stay isolated and remote joiners hang on
  // `WorkspaceCoMap.load`. The reopen is fast (the SQLite store is hot)
  // and the metadata writes above are flushed by the close-path WAL
  // checkpoint, so peers see them on first sync.
  await closeActiveWorkspace();
  const reopened = await openWorkspaceJazzNode(name);
  // After the reopen the fresh context has not yet seen the workspace
  // CoMap — the sync manager will only push CoValues the local node
  // knows about. Load the tree (including models + their leases) into
  // the new context so the data is replayed from SQLite into memory and
  // then forwarded to the sync server. Without this, `waitForSync`
  // times out: the node has nothing to sync because nothing was loaded.
  if (reopened.coId) {
    try {
      // Lazy-hydration: Composer contributes a shallow `modelSummaries`
      // preload (full model bodies stream on demand via `loadModel`),
      // Materials contributes the deep catalog preload — catalogs are
      // written by the seed/Materials IPC *before* share-enable, so by
      // the time we reopen they already exist in SQLite. cojson's sync
      // manager only pushes CoValues the local node has in its loaded
      // set, so without pulling the catalog into memory the post-reopen
      // sync server never receives the catalog data — joiners would see
      // the ref but not the contents.
      await WorkspaceCoMap.load(reopened.coId, {
        resolve: buildSyncPreloadResolve() as never,
      });
    } catch (err) {
      console.error("[jazz] preload workspace after enableSync failed", err);
    }
    try {
      const node = reopened.context.node as unknown as {
        syncManager?: {
          waitForSync?: (id: string, timeout?: number) => Promise<unknown>;
        };
      };
      if (node.syncManager?.waitForSync) {
        await node.syncManager.waitForSync(reopened.coId, 15_000);
      }
    } catch (err) {
      console.error("[jazz] waitForSync after enableSync failed", err);
    }
  }

  return updated;
}

/**
 * Open the workspace's Jazz node if both the index entry and `.jazz-id`
 * exist; otherwise bootstrap a fresh `WorkspaceCoMap`. Handles:
 *   - First-time open of a workspace that has no Jazz infra yet (legacy
 *     folder, or a freshly `resetWorkspace`-d e2e fixture).
 *   - Stale index entries pointing at a workspace whose `.jazz-id` file is
 *     gone (e2e test reruns that wipe the workspace dir between cases).
 * Idempotent. Safe to call on the boot path and on every `selectWorkspace`.
 */
export async function ensureJazzWorkspace(name: string): Promise<WorkspaceIndexEntry> {
  const indexEntry = findWorkspace(name);
  const dir = workspaceDir(name);
  const hasJazzId = existsSync(join(dir, ".jazz-id"));

  if (indexEntry && hasJazzId) {
    if (activeWorkspace?.name !== name) {
      if (activeWorkspace) await closeActiveWorkspace();
      await openWorkspaceJazzNode(name);
    }
    return indexEntry;
  }

  if (indexEntry && !hasJazzId) {
    // Stale entry; drop it so the uniqueness check in createJazzWorkspace passes.
    removeWorkspace(name);
  }
  if (activeWorkspace) await closeActiveWorkspace();
  return createJazzWorkspace(name);
}

/**
 * Force-reopen the active workspace's Jazz node. Unlike
 * `ensureJazzWorkspace`, this always tears down the current context
 * (releasing the SQLite lock, dropping the cached deep-resolved
 * `WorkspaceCoMap` handle, and re-dialing the sync peer) before
 * re-opening, so the next `requireActiveWorkspaceHandle` reads a fresh
 * resolved view — which is what the "Atualizar" / refreshFromPeers
 * flow needs to actually pull peer deltas into the renderer.
 */
export async function refreshJazzWorkspace(name: string): Promise<WorkspaceIndexEntry> {
  const indexEntry = findWorkspace(name);
  const dir = workspaceDir(name);
  const hasJazzId = existsSync(join(dir, ".jazz-id"));
  if (!indexEntry || !hasJazzId) {
    return ensureJazzWorkspace(name);
  }
  if (activeWorkspace) await closeActiveWorkspace();
  await openWorkspaceJazzNode(name);
  return indexEntry;
}

export async function getAccountId(): Promise<string | null> {
  if (!activeWorkspace) return null;
  const account = activeWorkspace.context.account as unknown as { $jazz: { id: string } };
  return account.$jazz.id;
}

