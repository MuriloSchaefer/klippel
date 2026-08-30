/**
 * The workspace's SQLite database — Klippel's store of record as Jazz is
 * retired (`src/docs/jazz-is-dead.md`).
 *
 * One file per workspace, beside the `jazz.sqlite` it replaces, so the two can
 * coexist while the migration runs and the old one can stay as a read-only
 * fallback until confidence is earned.
 *
 * **The schema is written to be cr-sqlite-compatible from day one** (see
 * `schema.ts`): every replicated table has a `NOT NULL` primary key and every
 * column a `NOT NULL DEFAULT`, because `crsql_as_crr` requires it and
 * retrofitting that later means an `ALTER TABLE` dance on every user's data.
 * The extension itself is optional — loaded when present, in which case the
 * replicated tables are upgraded to CRRs and `crsql_changes` becomes the sync
 * surface. Without it everything still works, single-peer.
 */
import Database, {
  type Database as Db,
  type Statement,
} from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";

import { app } from "electron";

import { HOME } from "../storage";
import { MIGRATIONS, REPLICATED_TABLES } from "./schema";

/** Loadable-extension file name, per platform. */
const EXT_FILE =
  process.platform === "win32"
    ? "crsqlite.dll"
    : process.platform === "darwin"
    ? "crsqlite.dylib"
    : "crsqlite.so";

/**
 * The cr-sqlite extension, or `null` when this install does not have it.
 *
 * Resolution order:
 *   1. `KLIPPEL_CRSQLITE_EXT` — an explicit path, for tests and bisecting.
 *   2. The packaged resource (`process.resourcesPath`), for a built app.
 *   3. `resources/crsqlite/<platform>-<arch>/` in the repo, for development —
 *      populated by `scripts/devtools/fetch-crsqlite.mjs`, not committed.
 *
 * Absent, the app runs single-peer: every table works, `crsql_changes` does
 * not exist, and sync is off. That degradation is reported rather than
 * silent — see `tryReplicate`.
 */
function resolveExtension(): string | null {
  const explicit = process.env.KLIPPEL_CRSQLITE_EXT;
  if (explicit) return existsSync(explicit) ? explicit : null;

  const key = `${process.platform}-${process.arch}`;
  const candidates = [
    join(process.resourcesPath ?? "", "crsqlite", key, EXT_FILE),
    join(app.getAppPath(), "resources", "crsqlite", key, EXT_FILE),
    join(app.getAppPath(), "..", "resources", "crsqlite", key, EXT_FILE),
  ];
  return candidates.find((path) => path && existsSync(path)) ?? null;
}

const CRSQLITE_EXT = resolveExtension();

export interface WorkspaceDb {
  db: Db;
  workspace: string;
  path: string;
  /** True when cr-sqlite loaded and the replicated tables are CRRs. */
  replicated: boolean;
}

let active: WorkspaceDb | null = null;

const dbPathFor = (workspace: string): string =>
  join(HOME, "workspaces", workspace, "klippel.sqlite");

/**
 * Load cr-sqlite and upgrade the replicated tables, or report why not.
 *
 * Never throws: a missing or incompatible extension means "no sync", not "no
 * app". The distinction is visible in `WorkspaceDb.replicated` and in the log,
 * because silently degrading to a single-peer database is exactly the kind of
 * thing that gets discovered in production.
 */
function tryReplicate(db: Db): boolean {
  try {
    // Upgrading a table that already holds rows is supported and is the
    // ordinary case: databases written before the extension shipped are
    // upgraded in place on the next open, and their existing rows become
    // replicable (verified — 500 rows in, 500 rows out, with change records).
    for (const table of REPLICATED_TABLES) {
      db.prepare(`SELECT crsql_as_crr(?)`).get(table);
    }
    console.log(`[db] cr-sqlite active — ${REPLICATED_TABLES.length} CRR tables`);
    return true;
  } catch (err) {
    console.error("[db] cr-sqlite failed to load; continuing unreplicated", err);
    return false;
  }
}

/** The site this database writes as — cr-sqlite's identity for the peer. */
export function siteId(db: Db): string | null {
  try {
    const row = db.prepare(`SELECT hex(crsql_site_id()) AS id`).get() as
      | { id: string }
      | undefined;
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Apply pending migrations inside one transaction each.
 *
 * `user_version` is the cursor: SQLite keeps it in the file header, so it costs
 * nothing to read and cannot drift from the file it describes.
 */
function migrate(db: Db): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v += 1) {
    const migration = MIGRATIONS[v];
    db.transaction(() => {
      db.exec(migration);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

/**
 * The active workspace's database, opening it if needed.
 *
 * Cached because opening is the one expensive thing SQLite does here (file
 * open, WAL recovery, migrations) and every read goes through this.
 */
export function workspaceDb(workspace: string): WorkspaceDb {
  if (active && active.workspace === workspace) return active;
  closeWorkspaceDb();

  const path = dbPathFor(workspace);
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);

  // WAL so a long read never blocks the writer; NORMAL because a lost
  // transaction on power failure costs one edit, and the alternative is an
  // fsync per write on the import path.
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  // On, for `material_usage` — the one table that has a declarable foreign
  // key, because it is the one table that is not replicated. The replicated
  // tables carry none (see `schema.ts`), so this costs them nothing.
  db.pragma("foreign_keys = ON");

  // Before the schema exists: cr-sqlite has to be loaded first so
  // `crsql_as_crr` is available, but the tables have to exist before they can
  // be upgraded — so load, migrate, then upgrade.
  // Load before migrating: `crsql_as_crr` has to exist by the time the tables
  // do, and the tables have to exist before they can be upgraded.
  let loaded = false;
  if (CRSQLITE_EXT) {
    try {
      db.loadExtension(CRSQLITE_EXT);
      loaded = true;
    } catch (err) {
      console.error("[db] cr-sqlite load failed", err);
    }
  }
  migrate(db);
  const replicated = loaded && tryReplicate(db);
  if (!loaded && !CRSQLITE_EXT) {
    console.warn(
      "[db] cr-sqlite not found — running single-peer, sync is off. " +
        "Run `node scripts/devtools/fetch-crsqlite.mjs`.",
    );
  }

  active = { db, workspace, path, replicated };
  return active;
}

/** The open database, or `null` when no workspace is active. */
export function activeWorkspaceDb(): WorkspaceDb | null {
  return active;
}

/**
 * Prepared statements, cached per connection.
 *
 * `Database.prepare` compiles SQL; on a read path that runs per page, per row
 * resolve and per delta tick, recompiling the same handful of statements is
 * pure waste. Keyed on the SQL text, which is a module constant, and dropped
 * with the connection it belongs to.
 */
const statementCache = new WeakMap<Db, Map<string, Statement>>();

export function prepare(db: Db, sql: string): Statement {
  let forDb = statementCache.get(db);
  if (!forDb) {
    forDb = new Map();
    statementCache.set(db, forDb);
  }
  const cached = forDb.get(sql);
  if (cached) return cached;
  const statement = db.prepare(sql);
  forDb.set(sql, statement);
  return statement;
}

export function closeWorkspaceDb(): void {
  if (!active) return;
  try {
    // cr-sqlite keeps per-connection state that must be torn down before the
    // handle closes, or the next open of the same file finds a dangling site.
    if (active.replicated) active.db.prepare(`SELECT crsql_finalize()`).get();
  } catch (err) {
    console.error("[db] crsql_finalize failed", err);
  }
  try {
    active.db.close();
  } catch (err) {
    console.error("[db] close failed", err);
  }
  active = null;
}
