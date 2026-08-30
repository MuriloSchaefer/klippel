/**
 * What changed for one renderer since it last asked, from SQLite.
 *
 * Replaces the CoValue-diffing delta in `materials.ts`. The question is the
 * same and so is the answer's shape (`CatalogDelta`), but the mechanism is
 * simpler because rows carry `updated_at` and deletes leave tombstones: a
 * delta is two indexed range queries, not a walk of every entry's signature.
 *
 * The contract from `docs/architecture/catalog-mirror.md` is unchanged:
 *
 * - **A delta never adds a row to the mirror.** It is scoped to the ids the
 *   client is on record as holding (`trackClientWindow`), so a row it has
 *   never seen is not smuggled in through a tick.
 * - **Types, industries and sellers merge.** They ride along whole because
 *   they are bounded by how many exist, and absence in a delta means
 *   "unchanged", never "deleted".
 * - **`total` is always reported**, because a windowed client cannot count a
 *   catalog it holds a page of.
 */
import { prepare, workspaceDb } from "../../../../../electron/main/db";
import { SQL, idSet } from "./queries";
import { rowToDto } from "./catalogDb";
import type { CatalogDelta, EdgeDTO } from "../typings/catalog";

/**
 * How far each renderer has been brought up to date, as a millisecond stamp.
 *
 * Process-local by design: it describes a live IPC client, and a client that
 * reconnects starts over with a window read, which is authoritative.
 */
const watermarks = new Map<string, number>();

/** Mark this client current as of now — after answering it with rows. */
export function markClientCurrent(clientId: string, at = Date.now()): void {
  watermarks.set(clientId, at);
}

export function dropClientWatermark(clientId: string): void {
  watermarks.delete(clientId);
}

export function dropAllWatermarks(): void {
  watermarks.clear();
}

/**
 * The delta for `clientId`, over the rows it is known to hold.
 *
 * A client with no watermark has not been answered yet in this process; it is
 * about to issue a window read, and that answer is authoritative, so it gets
 * the size and nothing else rather than a snapshot it did not ask for.
 */
export function catalogDelta(
  workspace: string,
  clientId: string,
  mirrored: Set<string> | null,
): CatalogDelta {
  const db = workspaceDb(workspace).db;
  const total = (prepare(db, SQL.countMaterials).get() as { n: number }).n;

  const since = watermarks.get(clientId);
  if (since === undefined) {
    markClientCurrent(clientId);
    return { total };
  }

  const now = Date.now();
  const changedRows = prepare(db, SQL.selectChangedSince).all(since) as Parameters<
    typeof rowToDto
  >[0][];
  const removedRows = prepare(db, SQL.selectTombstonesSince).all(since) as Array<{
    material_key: string;
  }>;

  // `null` means the client mirrors everything (the whole-catalog reader).
  const holds = (key: string): boolean => mirrored === null || mirrored.has(key);

  const delta: CatalogDelta = { total };
  const materials: { [id: string]: ReturnType<typeof rowToDto> } = {};
  const changedKeys: string[] = [];
  for (const row of changedRows) {
    if (!holds(row.material_key)) continue;
    materials[row.material_key] = rowToDto(row);
    changedKeys.push(row.material_key);
  }
  if (changedKeys.length) {
    delta.materials = materials;
    // Every current edge of a changed row, not only the ones that moved: a
    // material's industry and suppliers are derived from its whole edge set,
    // so a partial one silently drops relations.
    const edges: { [id: string]: EdgeDTO } = {};
    const edgeRows = prepare(db, SQL.selectEdgesBySource).all(
      idSet(changedKeys),
    ) as Array<{
      edge_key: string;
      source_key: string;
      type: string;
      target_id: string;
    }>;
    for (const e of edgeRows) {
      edges[e.edge_key] = {
        id: e.edge_key,
        type: e.type,
        sourceId: e.source_key,
        targetId: e.target_id,
      };
    }
    if (Object.keys(edges).length) delta.edges = edges;
  }

  const removed = removedRows
    .map((r) => r.material_key)
    .filter((key) => holds(key));
  if (removed.length) {
    delta.removedMaterials = removed;
    // A deleted row leaves the client's window with the delta that reports it,
    // or the next tick would report the same removal again.
    if (mirrored) for (const key of removed) mirrored.delete(key);
  }

  markClientCurrent(clientId, now);
  return delta;
}
