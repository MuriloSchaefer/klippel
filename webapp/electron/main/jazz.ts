import { join } from "path";
import { existsSync, ensureDirSync, outputFileSync, readFileSync, rmSync } from "fs-extra";
import lockfile from "proper-lockfile";
import Database from "better-sqlite3";
import {
  createJazzContextForNewAccount,
  createJazzContextFromExistingCredentials,
  MockSessionProvider,
  Group,
  co,
  type Account,
} from "jazz-tools";
// cojson does not expose its storage adapters through its public `exports`
// map; we reach into the published `./dist/*` wildcard with an explicit
// `/index.js` so node's exports resolver matches a real file path.
import { getSqliteStorage } from "cojson/dist/storage/sqlite/index.js";
import type { SQLiteDatabaseDriver } from "cojson/dist/storage/sqlite/index.js";
import { WasmCrypto } from "cojson/crypto/WasmCrypto";
import {
  EditLease,
  KlippelAccount,
  ModelCoMap,
  ModelsMap,
  WorkspaceCoMap,
  WorkspaceMetadata,
} from "../../src/kernel/modules/Store/schema";
import type {
  CreateModelInput,
  EditLeaseSnapshot,
  LoadedModel,
  ModelSummary,
} from "../../src/system/modules/Composer/typings";
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

export type ActiveWorkspace = {
  name: string;
  dir: string;
  coId: string;
  context: JazzContext;
  release: () => Promise<void>;
};

let activeWorkspace: ActiveWorkspace | null = null;

function workspaceDir(name: string): string {
  return getAbsPath(`workspaces/${name}`);
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
  const options = { retries: 0, stale: 30_000 };
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

  const jazzIdPath = join(dir, ".jazz-id");
  const coId = existsSync(jazzIdPath)
    ? readFileSync(jazzIdPath, { encoding: "utf-8" }).trim()
    : "";

  activeWorkspace = {
    name,
    dir,
    coId,
    context,
    release: async () => {
      try {
        context.done();
      } catch (err) {
        console.error("[jazz] context.done() failed", err);
      }
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
      } catch (err) {
        console.error("[jazz] wal_checkpoint failed", err);
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

  return activeWorkspace;
}

export async function closeActiveWorkspace(): Promise<void> {
  if (!activeWorkspace) return;
  const ws = activeWorkspace;
  activeWorkspace = null;
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
  const workspace = WorkspaceCoMap.create({ metadata, models }, group);
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

// ---------------------------------------------------------------------------
// Phase 2a — Models
// ---------------------------------------------------------------------------

const LEASE_TTL_MS = 60_000;

async function requireWorkspace() {
  if (!activeWorkspace) throw new Error("No active workspace");
  if (!activeWorkspace.coId) throw new Error("Active workspace has no coId");
  const settled = await WorkspaceCoMap.load(activeWorkspace.coId, {
    resolve: {
      models: { $each: { editLease: { $onError: "catch" } } },
    },
  });
  if (!settled || ("$isLoaded" in settled && settled.$isLoaded === false)) {
    throw new Error(`Could not load workspace ${activeWorkspace.coId}`);
  }
  // settled is now the loaded variant of Settled<...>.
  return settled as Exclude<typeof settled, { $isLoaded: false }>;
}

function currentAccountId(): string {
  const account = activeWorkspace!.context.account as unknown as { $jazz: { id: string } };
  return account.$jazz.id;
}

type LoadedLease = {
  holderAccountId: string;
  acquiredAt: number;
  expiresAt: number;
  $jazz: { set: (key: "expiresAt", value: number) => void };
};

/**
 * Normalize the `MaybeLoaded<EditLease>` we get from the resolved query into
 * either a fully loaded lease or `undefined`. `$onError: "catch"` lets a
 * missing/unauthorized lease through as a NotLoaded record; we treat both as
 * "no usable lease" since Phase 2a doesn't depend on knowing why it's absent.
 */
function loadedLease(model: { editLease?: unknown }): LoadedLease | undefined {
  const lease = model.editLease as
    | (LoadedLease & { $isLoaded?: boolean })
    | { $isLoaded: false }
    | undefined;
  if (!lease) return undefined;
  if ("$isLoaded" in lease && lease.$isLoaded === false) return undefined;
  return lease as LoadedLease;
}

export async function listModels(): Promise<ModelSummary[]> {
  const workspace = await requireWorkspace();
  const out: ModelSummary[] = [];
  for (const [id, model] of Object.entries(workspace.models)) {
    if (!model) continue;
    out.push({
      id,
      coId: model.$jazz.id,
      name: model.name,
      description: model.description,
      hasSvg: model.$jazz.refs.svg !== undefined,
      updatedAt: model.updatedAt,
    });
  }
  return out;
}

export async function loadModel(id: string): Promise<LoadedModel | null> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) return null;
  const lease = loadedLease(model);
  return {
    id: model.id,
    coId: model.$jazz.id,
    name: model.name,
    description: model.description,
    graphJson: model.graphJson,
    hasSvg: model.svg !== undefined,
    updatedAt: model.updatedAt,
    editLease: lease
      ? {
          holderAccountId: lease.holderAccountId,
          acquiredAt: lease.acquiredAt,
          expiresAt: lease.expiresAt,
        }
      : undefined,
  };
}

export async function createModel(input: CreateModelInput): Promise<ModelSummary> {
  const workspace = await requireWorkspace();
  if (workspace.models[input.id]) {
    throw new Error(`Model "${input.id}" already exists`);
  }
  const owner = workspace.$jazz.owner;
  const model = ModelCoMap.create(
    {
      id: input.id,
      name: input.name,
      description: input.description ?? "",
      graphJson: input.graphJson,
      updatedAt: Date.now(),
    },
    owner,
  );
  workspace.models.$jazz.set(input.id, model);
  return {
    id: model.id,
    coId: model.$jazz.id,
    name: model.name,
    description: model.description,
    hasSvg: false,
    updatedAt: model.updatedAt,
  };
}

function leaseHeldByOther(model: { editLease?: unknown }): boolean {
  const lease = loadedLease(model);
  if (!lease) return false;
  if (lease.expiresAt < Date.now()) return false;
  return lease.holderAccountId !== currentAccountId();
}

export async function updateModelGraph(id: string, graphJson: string): Promise<void> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  if (leaseHeldByOther(model)) {
    throw new Error(`Model "${id}" is locked by another editor`);
  }
  model.$jazz.set("graphJson", graphJson);
  model.$jazz.set("updatedAt", Date.now());
}

export async function updateModelDescription(id: string, description: string): Promise<void> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  model.$jazz.set("description", description);
  model.$jazz.set("updatedAt", Date.now());
}

export async function acquireEditLease(id: string): Promise<EditLeaseSnapshot> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  const existing = loadedLease(model);
  if (existing && existing.expiresAt >= Date.now() && existing.holderAccountId !== currentAccountId()) {
    throw new Error(`Model "${id}" is locked by ${existing.holderAccountId}`);
  }
  const now = Date.now();
  const owner = model.$jazz.owner;
  const lease = EditLease.create(
    {
      holderAccountId: currentAccountId(),
      acquiredAt: now,
      expiresAt: now + LEASE_TTL_MS,
    },
    owner,
  );
  model.$jazz.set("editLease", lease);
  return {
    holderAccountId: lease.holderAccountId,
    acquiredAt: lease.acquiredAt,
    expiresAt: lease.expiresAt,
  };
}

export async function renewEditLease(id: string): Promise<EditLeaseSnapshot> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  const lease = loadedLease(model);
  if (!lease || lease.holderAccountId !== currentAccountId()) {
    throw new Error(`Cannot renew lease for "${id}" — not the holder`);
  }
  const now = Date.now();
  lease.$jazz.set("expiresAt", now + LEASE_TTL_MS);
  return {
    holderAccountId: lease.holderAccountId,
    acquiredAt: lease.acquiredAt,
    expiresAt: lease.expiresAt,
  };
}

export async function releaseEditLease(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) return;
  const lease = loadedLease(model);
  if (!lease || lease.holderAccountId !== currentAccountId()) return;
  model.$jazz.set("editLease", undefined);
}

/**
 * Upload an SVG payload as a BinaryCoStream attached to `ModelCoMap.svg`.
 * The renderer hands us the raw markup string; we transcode to bytes and
 * delegate to Jazz's chunked stream writer. Sanitization is the renderer's
 * job (DOMPurify) — main-process is content-agnostic.
 */
export async function uploadModelSvg(id: string, svgContent: string): Promise<{ coId: string }> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  if (leaseHeldByOther(model)) {
    throw new Error(`Model "${id}" is locked by another editor`);
  }
  const bytes = new TextEncoder().encode(svgContent);
  // ArrayBuffer typing across DOM and Node lib varies; the underlying buffer
  // is interchangeable at runtime.
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const owner = model.$jazz.owner;
  const stream = await co.fileStream().createFromArrayBuffer(
    ab,
    "image/svg+xml",
    `${id}.svg`,
    { owner },
  );
  model.$jazz.set("svg", stream);
  model.$jazz.set("updatedAt", Date.now());
  return { coId: stream.$jazz.id };
}

/**
 * Read the SVG BinaryCoStream attached to a model back to a UTF-8 string.
 * Returns `null` if the model has no SVG yet.
 */
export async function loadModelSvg(id: string): Promise<string | null> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  const svgRef = model.$jazz.refs.svg;
  if (!svgRef) return null;
  const blob = await co.fileStream().loadAsBlob(svgRef.id);
  if (!blob) return null;
  return new TextDecoder().decode(await blob.arrayBuffer());
}
