/**
 * The sync client: ships `crsql_changes` to a relay and applies what comes
 * back.
 *
 * All of the logic lives here rather than in the relay, which forwards bytes
 * (`relay.ts`). What the client owns:
 *
 * - **Cursors.** Per peer, the highest `db_version` we have applied *from that
 *   peer's database*. cr-sqlite re-stamps a change it applies with its own
 *   clock while preserving the originating `site_id` — verified — so the
 *   cursor tracks the sender, not the author, and a peer can relay changes it
 *   did not write. Stored in `crsql_tracked_peers`, which is cr-sqlite's own
 *   table for exactly this and is not replicated.
 * - **Never echoing.** Changes are selected with `site_id != <recipient>`, so
 *   a peer is never sent its own writes back to merge against itself.
 * - **Applying as one transaction.** A batch lands whole or not at all; a
 *   half-applied row would leave a material without the edges that give it an
 *   industry, which the renderer reads as lost relations.
 * - **Suspending CHECK constraints while merging.** See `applyChanges`.
 */
import type { Database as Db } from "better-sqlite3";
import { WebSocket } from "ws";

import {
  SYNC_PROTOCOL,
  parseMessage,
  type ChangesMessage,
  type WantMessage,
} from "./protocol";
import { decodeChange, encodeChange, type RawChange } from "./wire";

/** Columns of `crsql_changes`, in the order both statements use. */
const CHANGE_COLUMNS = `"table", pk, cid, val, col_version, db_version, site_id, cl, seq`;

const SELECT_CHANGES = `
  SELECT ${CHANGE_COLUMNS} FROM crsql_changes
  WHERE db_version > ? AND hex(site_id) != ?
  ORDER BY db_version ASC`;

const INSERT_CHANGE = `
  INSERT INTO crsql_changes (${CHANGE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// Site ids are bound as BLOBs rather than converted in SQL: `unhex()` needs
// SQLite 3.41+, and better-sqlite3 bundles its own build whose version is not
// ours to assume.
const READ_CURSOR = `
  SELECT version FROM crsql_tracked_peers
  WHERE site_id = ? AND tag = 0 AND event = 0`;

const WRITE_CURSOR = `
  INSERT INTO crsql_tracked_peers (site_id, version, seq, tag, event)
  VALUES (?, ?, 0, 0, 0)
  ON CONFLICT (site_id, tag, event) DO UPDATE SET version = excluded.version`;

/** A hex site id as the BLOB the tables store. */
const siteBlob = (site: string): Buffer => Buffer.from(site, "hex");

const ALL_CURSORS = `
  SELECT hex(site_id) AS site, version FROM crsql_tracked_peers
  WHERE tag = 0 AND event = 0`;

/** This database's own site id, as lowercase hex. */
export function localSite(db: Db): string {
  const row = db.prepare(`SELECT hex(crsql_site_id()) AS s`).get() as {
    s: string;
  };
  return row.s.toLowerCase();
}

/**
 * This peer's *own* new changes — the broadcast set.
 *
 * Filtered by author, and that filter is the whole point. A peer that has just
 * caught up holds every other peer's history too; without the filter its next
 * push echoes all of it back to the room — measured at 193 898 rows re-sent
 * after one edit on a 1 000-material workspace. It converges either way, since
 * applying a change twice is a no-op, but it turns a 6 ms propagation into
 * seconds of pointless traffic.
 *
 * Nothing is lost by it: a peer that was away asks (`want`), and `changesFor`
 * answers with everything it holds regardless of author.
 */
export function changesSince(
  db: Db,
  since: bigint,
  authorSite: string,
): { rows: ReturnType<typeof encodeChange>[]; head: bigint } {
  const raw = db
    .prepare(
      `SELECT ${CHANGE_COLUMNS} FROM crsql_changes
       WHERE db_version > ? AND hex(site_id) = ? ORDER BY db_version ASC`,
    )
    .all(since, authorSite.toUpperCase()) as RawChange[];
  let head = since;
  const rows = raw.map((row) => {
    const version = BigInt(row.db_version);
    if (version > head) head = version;
    return encodeChange(row);
  });
  return { rows, head };
}

/** Changes this database holds that `recipientSite` has not seen. */
export function changesFor(
  db: Db,
  recipientSite: string,
  since: bigint,
): { rows: ReturnType<typeof encodeChange>[]; head: bigint } {
  const raw = db
    .prepare(SELECT_CHANGES)
    .all(since, recipientSite.toUpperCase()) as RawChange[];
  let head = since;
  const rows = raw.map((row) => {
    const version = BigInt(row.db_version);
    if (version > head) head = version;
    return encodeChange(row);
  });
  return { rows, head };
}

/**
 * Apply a batch from `senderSite`, and move that peer's cursor.
 *
 * CHECK constraints are suspended for the duration, and that is not a
 * shortcut. A change row carries **one column**, so cr-sqlite materialises an
 * incoming row from column defaults and then fills it in; a closed-vocabulary
 * check like `material_edges.type IN ('conformsTo', …)` rejects that
 * intermediate row, whose `type` is still `''`. The batch then fails whole,
 * and the peers silently stop converging — which is exactly how this was
 * found.
 *
 * A check states an invariant about a *complete* row, so it belongs on the
 * writer, where it still runs in full. Merged rows are complete only once the
 * batch is in, and the batch is one transaction — so nothing outside this
 * function ever observes a row mid-materialisation.
 */
export function applyChanges(
  db: Db,
  senderSite: string,
  message: ChangesMessage,
): number {
  if (!message.rows.length) return 0;
  const insert = db.prepare(INSERT_CHANGE);
  const cursor = db.prepare(WRITE_CURSOR);
  // Connection-scoped, and better-sqlite3 is synchronous, so nothing else can
  // run against this handle between the two pragmas.
  db.pragma("ignore_check_constraints = ON");
  try {
    db.transaction(() => {
      for (const row of message.rows) {
        insert.run(...(decodeChange(row) as never[]));
      }
      // The cursor is the sender's clock, so it is only meaningful together
      // with the sender's site — recorded in the same transaction as the rows
      // it describes, or a crash between them would skip changes forever.
      cursor.run(siteBlob(senderSite), message.head);
    })();
  } finally {
    db.pragma("ignore_check_constraints = OFF");
  }
  return message.rows.length;
}

function readCursor(db: Db, site: string): bigint {
  const row = db.prepare(READ_CURSOR).get(siteBlob(site)) as
    | { version: bigint | number }
    | undefined;
  return row ? BigInt(row.version) : 0n;
}

function allCursors(db: Db): Record<string, string> {
  const rows = db.prepare(ALL_CURSORS).all() as Array<{
    site: string;
    version: bigint | number;
  }>;
  const have: Record<string, string> = {};
  for (const row of rows) have[row.site.toLowerCase()] = String(row.version);
  return have;
}

export interface SyncClientOptions {
  db: Db;
  workspace: string;
  url: string;
  token?: string;
  /** Called after remote changes land, so the app can refresh its readers. */
  onApplied?: (count: number) => void;
  onLog?: (message: string) => void;
}

export interface SyncClient {
  /** Broadcast anything written since the last push. */
  push: () => void;
  close: () => void;
  readonly site: string;
  /** Live snapshot, for the status surface — see `status()`. */
  status: () => SyncClientStatus;
}

export interface SyncClientStatus {
  url: string;
  site: string;
  connected: boolean;
  /** Change rows sent and applied since this client started. */
  pushed: number;
  applied: number;
}

/**
 * Connect to a relay and keep this database in step with the room.
 *
 * Reconnects on drop with a bounded backoff: a relay restart must not need an
 * app restart, and a peer that cannot reach the relay has to keep working
 * offline — which it does, because the local database is the store of record
 * and sync is a courier, not a dependency.
 */
export function startSyncClient(options: SyncClientOptions): SyncClient {
  const { db, workspace, url } = options;
  const log = options.onLog ?? ((m: string) => console.log(`[sync] ${m}`));
  const site = localSite(db);

  let socket: WebSocket | null = null;
  let closed = false;
  let lastPushed = 0n;
  // Counters, not gauges: "0 pushed" while the user has been editing is the
  // thing worth seeing, and a gauge would hide it.
  let pushed = 0;
  let applied = 0;
  let retry = 0;
  let timer: NodeJS.Timeout | null = null;

  const send = (payload: unknown) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  };

  /** "Tell me what I have missed", to whoever is listening. */
  const askForChanges = () => {
    const want: WantMessage = { t: "want", site, have: allCursors(db) };
    send(want);
  };

  /** Answer a peer's `want`, or push our own new writes to the room. */
  const sendChangesTo = (recipientSite: string, since: bigint) => {
    const { rows, head } = changesFor(db, recipientSite, since);
    if (!rows.length) return;
    const message: ChangesMessage = {
      t: "changes",
      site,
      rows,
      head: head.toString(),
    };
    send(message);
    log(`sent ${rows.length} changes to ${recipientSite.slice(0, 8)}`);
  };

  const connect = () => {
    if (closed) return;
    socket = new WebSocket(url);

    socket.on("open", () => {
      retry = 0;
      send({ t: "hello", v: SYNC_PROTOCOL, workspace, site, token: options.token });
      // Ask the room for anything we have missed. Sent on every connect, not
      // only the first: while we were away the room moved on.
      askForChanges();
      log(`connected to ${url} as ${site.slice(0, 8)}`);
    });

    socket.on("message", (data) => {
      const message = parseMessage(String(data));
      if (!message) return;
      try {
        if (message.t === "joined") {
          // Someone new is here. Ask again rather than assume our last
          // question was heard: they were not in the room when we asked.
          askForChanges();
          return;
        }
        if (message.t === "want") {
          // What this peer says it already has from *us*.
          sendChangesTo(message.site, BigInt(message.have[site] ?? "0"));
          return;
        }
        if (message.t === "changes") {
          const count = applyChanges(db, message.site, message);
          if (count) {
            applied += count;
            log(`applied ${count} changes from ${message.site.slice(0, 8)}`);
            options.onApplied?.(count);
          }
        }
      } catch (err) {
        // One bad batch must not take the connection down: the peer stays
        // online, keeps its own writes, and re-asks on the next connect.
        log(`failed to handle a ${message.t} message: ${String(err)}`);
      }
    });

    const reconnect = () => {
      if (closed) return;
      socket = null;
      retry = Math.min(retry + 1, 6);
      const delay = Math.min(30_000, 500 * 2 ** retry);
      timer = setTimeout(connect, delay);
      timer.unref?.();
    };
    socket.on("close", reconnect);
    socket.on("error", (err) => log(`socket error: ${String(err)}`));
  };

  connect();

  return {
    site,
    status: () => ({
      url,
      site,
      connected: socket?.readyState === WebSocket.OPEN,
      pushed,
      applied,
    }),
    push: () => {
      // Broadcast what is new since our last push. One message serves the
      // whole room: applying a change twice is a no-op for a CRDT, so a
      // recipient that already has some of it simply merges them again.
      //
      // `lastPushed` is in-memory on purpose. It is an optimisation, not a
      // correctness cursor — after a restart the room's `want` exchange
      // establishes what each peer is actually missing.
      const { rows, head } = changesSince(db, lastPushed, site);
      if (!rows.length) return;
      lastPushed = head;
      pushed += rows.length;
      send({ t: "changes", site, rows, head: head.toString() } as ChangesMessage);
      log(`pushed ${rows.length} changes`);
    },
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      socket?.close();
      socket = null;
    },
  };
}

export { readCursor };
