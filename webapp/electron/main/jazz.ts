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
import { WasmCrypto } from "cojson/crypto/WasmCrypto";
import { WebSocketPeerWithReconnection } from "cojson-transport-ws";
import WebSocket from "ws";
import {
  KlippelAccount,
  ModelsMap,
  ModelSummariesMap,
  ModelSummary,
  WorkspaceCoMap,
  WorkspaceMetadata,
} from "../../src/kernel/modules/Store/schema";
import { getAbsPath } from "./storage";
import {
  upsertWorkspace,
  findWorkspace,
  readWorkspacesIndex,
  removeWorkspace,
  type WorkspaceIndexEntry,
} from "./workspacesIndex";

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

  // Now that the context exists, wire the sync reconnector and wait for
  // the socket to open so the very next `WorkspaceCoMap.load` finds a
  // live peer instead of an empty sync manager.
  let syncReconnector: SyncReconnector | null = null;
  if (syncUrl) {
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

  return activeWorkspace!;
}

/**
 * Resolve (and cache) the active workspace's `WorkspaceCoMap` handle.
 *
 * The resolve set is intentionally narrow:
 *   - `metadata` — read on every IPC for syncOptIn / ownerAccountId.
 *   - `modelSummaries.$each` — drives `listModels` and is the index used
 *     by `loadModel` to look up a model's coId.
 *   - `models` (container only) — lets mutators call `models.$jazz.set`
 *     without dragging each `ModelCoMap`'s history through the sync
 *     manager. Individual models are loaded on demand by `loadModel` /
 *     mutators via `ModelCoMap.load(modelCoId)`.
 *
 * Backfill: workspaces created before lazy hydration landed have no
 * `modelSummaries` record (or have an empty one while `models` is
 * populated). On first call after upgrade we walk `models`, synthesize
 * the missing summaries, and write them back. Idempotent — subsequent
 * calls observe a fully-populated `modelSummaries` and skip the walk.
 */
export async function requireActiveWorkspaceHandle(): Promise<LoadedWorkspaceHandle> {
  if (!activeWorkspace) throw new Error("No active workspace");
  if (!activeWorkspace.coId) throw new Error("Active workspace has no coId");
  if (activeWorkspace.handle) return activeWorkspace.handle;

  const settled = await WorkspaceCoMap.load(activeWorkspace.coId, {
    resolve: {
      metadata: true,
      models: true,
      modelSummaries: { $each: { $onError: "catch" }, $onError: "catch" },
    },
  });
  if (!settled || ("$isLoaded" in settled && settled.$isLoaded === false)) {
    throw new Error(`Could not load workspace ${activeWorkspace.coId}`);
  }
  await backfillModelSummaries(settled);
  activeWorkspace.handle = settled;
  return settled;
}

/**
 * One-time migration for pre-lazy-hydration workspaces. If
 * `modelSummaries` is absent or missing entries that exist in `models`,
 * synthesize them from the deep-resolved `ModelCoMap` bodies. Runs once
 * per process on first `requireActiveWorkspaceHandle` after upgrade; the
 * cost (a single `models.$each` deep-load) is paid only when the
 * summary record is incomplete.
 */
async function backfillModelSummaries(workspace: LoadedWorkspaceHandle): Promise<void> {
  const w = workspace as unknown as {
    $jazz: { owner: Group; set: (k: string, v: unknown) => void };
    models: Record<string, unknown>;
    modelSummaries?: Record<string, unknown> | null;
  };
  const modelIds = Object.keys(w.models ?? {});
  const summaryIds = new Set(Object.keys(w.modelSummaries ?? {}));
  if (modelIds.length > 0 && modelIds.every((id) => summaryIds.has(id))) return;

  // Deep-load the models record so we can read each model's fields. This
  // is the one path that still walks `models.$each` — it runs at most
  // once per workspace per process.
  const deep = await WorkspaceCoMap.load(workspace.$jazz.id, {
    resolve: { models: { $each: { $onError: "catch" } } },
  });
  if (!deep || ("$isLoaded" in deep && deep.$isLoaded === false)) return;
  const deepModels = (deep as unknown as { models: Record<string, unknown> }).models;

  const owner = w.$jazz.owner;
  let summariesRecord = w.modelSummaries as unknown as
    | (Record<string, unknown> & { $jazz: { set: (k: string, v: unknown) => void } })
    | null
    | undefined;
  if (!summariesRecord) {
    const created = ModelSummariesMap.create({}, owner);
    w.$jazz.set("modelSummaries", created);
    summariesRecord = created as unknown as typeof summariesRecord;
  }

  for (const id of modelIds) {
    if (summaryIds.has(id)) continue;
    const model = deepModels[id] as
      | undefined
      | {
          $isLoaded?: boolean;
          $jazz: { id: string; refs: { svg?: unknown } };
          id: string;
          name: string;
          description: string;
          updatedAt: number;
        };
    if (!model || model.$isLoaded === false) continue;
    const summary = ModelSummary.create(
      {
        id: model.id,
        modelCoId: model.$jazz.id,
        name: model.name,
        description: model.description,
        updatedAt: model.updatedAt,
        hasSvg: model.$jazz.refs.svg !== undefined,
      },
      owner,
    );
    summariesRecord!.$jazz.set(id, summary);
  }
}

export async function closeActiveWorkspace(): Promise<void> {
  if (!activeWorkspace) return;
  const ws = activeWorkspace;
  activeWorkspace = null;
  ws.handle = null;
  await ws.release();
}

export function getActiveWorkspace(): ActiveWorkspace | null {
  return activeWorkspace;
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
    const loaded = await WorkspaceCoMap.load(coId, {
      resolve: {
        metadata: true,
        modelSummaries: { $each: { $onError: "catch" }, $onError: "catch" },
      },
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
      // Preload only the summaries; full model bodies stream on demand.
      // Matches the lazy-hydration path elsewhere — the previous deep
      // `models.$each.editLease` load forced every model into RAM just
      // to seed the sync manager.
      await WorkspaceCoMap.load(reopened.coId, {
        resolve: {
          metadata: true,
          modelSummaries: { $each: { $onError: "catch" }, $onError: "catch" },
        },
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

export async function getAccountId(): Promise<string | null> {
  if (!activeWorkspace) return null;
  const account = activeWorkspace.context.account as unknown as { $jazz: { id: string } };
  return account.$jazz.id;
}

