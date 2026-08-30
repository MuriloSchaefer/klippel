/**
 * One-way projection of a workspace's Jazz catalog into SQLite.
 *
 * The bridge for phase 1 of the migration (`src/docs/analysis/post-jazz-storage-study.md`):
 * Jazz is still the store of record, SQLite answers the reads. It runs once
 * per workspace — the marker is the SQLite catalog being non-empty — and it is
 * the one place that still pays the whole-catalog deep resolve, on purpose,
 * because projecting everything is exactly what it is for.
 *
 * `jazz.sqlite` is never written or deleted here. It stays as the fallback
 * until the new store has earned its keep.
 */
import { loadMaterialsCatalog } from "./materials";
import { countMaterials } from "./catalogDb";
import { reindexAll, writeCatalog } from "./catalogWriter";

export interface MigrationResult {
  /** `false` when the projection was already done and nothing was read. */
  ran: boolean;
  materials: number;
  edges: number;
  ms: number;
}

let inFlight: Promise<MigrationResult> | null = null;

/**
 * Workspaces this process has already established as projected.
 *
 * Without it every write would re-run the `count(*)` guard — and an import is
 * thousands of writes, so a cheap query becomes a scan per row.
 */
const projected = new Set<string>();

/**
 * Project the Jazz catalog into SQLite if it has not been projected yet.
 *
 * Concurrent callers share one run: the first read after a workspace opens is
 * usually several IPC calls at once, and projecting twice would be slow rather
 * than wrong (the writes are upserts).
 */
export async function ensureCatalogProjected(
  workspace: string,
): Promise<MigrationResult> {
  if (projected.has(workspace)) return { ran: false, materials: 0, edges: 0, ms: 0 };
  if (inFlight) return inFlight;
  inFlight = project(workspace);
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

async function project(workspace: string): Promise<MigrationResult> {
  const startedAt = Date.now();
  if (countMaterials(workspace) > 0) {
    projected.add(workspace);
    return { ran: false, materials: 0, edges: 0, ms: 0 };
  }

  // The whole catalog, deeply — the expensive read this migration exists to
  // make unnecessary from here on.
  const snapshot = await loadMaterialsCatalog();
  const materials = Object.values(snapshot.materials);
  const edges = Object.values(snapshot.edges);

  // Chunked so one enormous transaction does not hold the write lock (and the
  // main thread) for the length of the whole projection.
  const CHUNK = 500;
  writeCatalog(workspace, {
    materialTypes: Object.values(snapshot.materialTypes),
    industries: Object.values(snapshot.industries),
    sellers: Object.values(snapshot.sellers),
    edges,
  });
  for (let i = 0; i < materials.length; i += CHUNK) {
    writeCatalog(workspace, { materials: materials.slice(i, i + CHUNK) });
  }
  reindexAll(workspace);

  projected.add(workspace);
  const result = {
    ran: true,
    materials: materials.length,
    edges: edges.length,
    ms: Date.now() - startedAt,
  };
  console.log(
    `[catalog-migration] projected ${result.materials} materials / ` +
      `${result.edges} edges into SQLite in ${result.ms}ms`,
  );
  return result;
}

/** Forget that this process projected anything — a workspace switch. */
export function resetCatalogMigration(): void {
  inFlight = null;
  projected.clear();
}
