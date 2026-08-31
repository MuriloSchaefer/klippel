/**
 * The catalog's IPC entry points.
 *
 * Phase 2 of `src/docs/analysis/post-jazz-storage-study.md`: **SQLite is the
 * store of record.** Reads and writes both land here; Jazz is no longer
 * written at all, and is read exactly once per workspace, by the projection
 * that carries an existing catalog across (`catalogMigration.ts`).
 *
 * Nothing in the renderer changed to get here. Same channels, same DTOs, same
 * contract (`docs/architecture/catalog-mirror.md`) — including the delta
 * ticks, which are now answered from `updated_at` and tombstones rather than
 * by diffing CoValue signatures.
 */
import { getActiveWorkspace } from "../../../../../electron/main/jazz";
import { pushLocalChanges } from "../../../../../electron/main/sync";
import { notifyCatalogChanged, windowOf } from "./materials";
import {
  loadWindow,
  getMaterialRow,
  countMaterials,
  MAX_WINDOW_LIMIT,
} from "./catalogDb";
import {
  applyMaterialUpdate,
  applyStockUpdate,
  catalogIsEmpty,
  deleteMaterialRow,
  registerTypeVersion,
  replaceUsage,
  writeCatalog,
} from "./catalogWriter";
import {
  catalogDelta,
  dropAllWatermarks,
  markClientCurrent,
} from "./catalogDelta";
import { ensureCatalogProjected } from "./catalogMigration";
import { collectMaterialUsage } from "./usage";
import { trackClientWindow } from "./materials";
import type {
  AddMaterialInput,
  CatalogDelta,
  CatalogSnapshot,
  CatalogWindow,
  CatalogWindowRequest,
  MaterialDTO,
  MaterialTypeVersionDTO,
  SeedCatalogInput,
  UpdateMaterialInput,
  UpdateMaterialStockInput,
} from "../typings/catalog";

/** The workspace SQLite reads and writes are scoped to. */
function requireWorkspaceName(): string {
  const active = getActiveWorkspace();
  if (!active) throw new Error("No active workspace");
  return active.name;
}

/**
 * Make sure SQLite holds this workspace's catalog, and that the ranking it
 * sorts by is current.
 *
 * The projection is a one-time cost per workspace — the only remaining read of
 * the Jazz catalog, and the reason this still depends on it at all.
 */
async function ready(): Promise<string> {
  const workspace = requireWorkspaceName();
  const migration = await ensureCatalogProjected(workspace);
  if (migration.ran) await refreshUsage(workspace);
  return workspace;
}

async function refreshUsage(workspace: string): Promise<void> {
  try {
    replaceUsage(workspace, await collectMaterialUsage());
  } catch (err) {
    console.error("[catalog] usage projection failed", err);
  }
}

/**
 * Re-rank from current usage counts. Composer calls this when a model's
 * material references change.
 */
export async function refreshCatalogRanking(): Promise<void> {
  const active = getActiveWorkspace();
  if (!active) return;
  await refreshUsage(active.name);
}

/**
 * A write happened: tell this app's renderers, and put it on the wire.
 *
 * Both, because they serve different readers — the local UI refreshes from the
 * tick, other peers from the change rows. `pushLocalChanges` is a no-op when
 * the workspace does not sync.
 */
function afterWrite(): void {
  notifyCatalogChanged();
  pushLocalChanges();
}

// ---- reads ----------------------------------------------------------

export async function loadMaterialsWindow(
  clientId: string,
  request: CatalogWindowRequest,
): Promise<CatalogWindow> {
  const workspace = await ready();
  const answer = loadWindow(workspace, request);

  // What this client now holds — the scope of its deltas. Recorded here, as
  // it always was; the difference is that the delta reads the same tables the
  // answer came from, so the two cannot disagree.
  trackClientWindow(clientId, Object.keys(answer.materials), {
    reset: request.reset === true,
  });
  markClientCurrent(clientId);
  return answer;
}

export async function getMaterial(id: string): Promise<MaterialDTO | null> {
  const workspace = await ready();
  return getMaterialRow(workspace, id);
}

export async function computeCatalogDelta(
  clientId: string,
): Promise<CatalogDelta> {
  const workspace = await ready();
  return catalogDelta(workspace, clientId, windowOf(clientId));
}

/**
 * The whole catalog. The perf-harness / explicit-refresh path — invariant 8.1
 * still holds, nothing in the app dispatches it.
 */
/**
 * Page size for the whole-catalog read — the reader's own ceiling, so the walk
 * makes as few round trips as it is allowed to.
 */
const CATALOG_PAGE = MAX_WINDOW_LIMIT;

export async function loadMaterialsCatalog(
  clientId?: string,
): Promise<CatalogSnapshot> {
  const workspace = await ready();
  const total = countMaterials(workspace);
  // Paged, not one big page. `loadWindow` clamps any request to
  // MAX_WINDOW_LIMIT, so asking for `total` in one go silently returned the
  // first 1 000 by rank and dropped the rest — a caller reading "the whole
  // catalog" got a truncated one with nothing to indicate it. Walking the
  // pages honours that ceiling and still answers the question asked.
  const snapshot: CatalogSnapshot = {
    materials: {},
    materialTypes: {},
    industries: {},
    sellers: {},
    edges: {},
  };
  for (let offset = 0; offset < Math.max(1, total); offset += CATALOG_PAGE) {
    const answer = loadWindow(workspace, { limit: CATALOG_PAGE, offset });
    Object.assign(snapshot.materials, answer.materials);
    Object.assign(snapshot.materialTypes, answer.materialTypes);
    Object.assign(snapshot.industries, answer.industries);
    Object.assign(snapshot.sellers, answer.sellers);
    Object.assign(snapshot.edges, answer.edges);
    // A page that comes back short means we have reached the end — including
    // the empty-catalog case, where `total` is 0 and one pass runs.
    if (Object.keys(answer.materials).length < CATALOG_PAGE) break;
  }
  if (clientId) {
    trackClientWindow(clientId, Object.keys(snapshot.materials), { reset: true });
    markClientCurrent(clientId);
  }
  return snapshot;
}

// ---- writes ---------------------------------------------------------

export async function addMaterial(
  input: AddMaterialInput,
  clientId?: string,
): Promise<MaterialDTO> {
  const result = await addMaterials([input], clientId);
  const material = result.materials[0];
  if (!material) {
    throw new Error(result.failed[0]?.reason ?? "addMaterial failed");
  }
  return material;
}

export interface AddMaterialsResult {
  materials: MaterialDTO[];
  failed: Array<{ id: string; reason: string }>;
}

/**
 * Add materials — one row from a form, or every row of an import.
 *
 * The whole batch is one transaction, which is why an import is now seconds
 * rather than the ~1.6 rows/s the CoValue path managed: there is no per-row
 * fixed cost left to pay.
 */
export async function addMaterials(
  inputs: AddMaterialInput[],
  clientId?: string,
): Promise<AddMaterialsResult> {
  const workspace = await ready();
  const materials: MaterialDTO[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  const edges: CatalogWriteEdges = [];
  const industries: Array<{ id: string; name: string }> = [];
  const sellers: Array<{ id: string; name: string }> = [];

  for (const input of inputs) {
    const id = input.material.id;
    if (getMaterialRow(workspace, id)) {
      failed.push({ id, reason: `Material "${id}" already exists` });
      continue;
    }
    const dto: MaterialDTO = {
      ...input.material,
      schemaVersion: input.typeVersion.includes("@")
        ? input.typeVersion.split("@")[1]
        : input.material.schemaVersion,
      updatedAt: Date.now(),
    };
    materials.push(dto);
    edges.push({
      id: `conformsTo:${id}`,
      type: "conformsTo",
      sourceId: id,
      targetId: input.typeVersion,
    });
    if (input.industryId) {
      industries.push({ id: input.industryId, name: input.industryId });
      edges.push({
        id: `manufacturedBy:${id}`,
        type: "manufacturedBy",
        sourceId: id,
        targetId: input.industryId,
      });
    }
    for (const sellerId of input.sellerIds ?? []) {
      sellers.push({ id: sellerId, name: sellerId });
      edges.push({
        id: `suppliedBy:${id}:${sellerId}`,
        type: "suppliedBy",
        sourceId: id,
        targetId: sellerId,
      });
    }
  }

  if (materials.length) {
    writeCatalog(workspace, {
      materials,
      edges,
      industries: industries.map((o) => ({
        ...o,
        type: "industry",
        updatedAt: Date.now(),
      })),
      sellers: sellers.map((o) => ({
        ...o,
        type: "seller",
        updatedAt: Date.now(),
      })),
    });
    // The author's own renderer already shows these rows optimistically, so
    // main has to record them as mirrored or every later edit to one would be
    // filtered out of that client's deltas.
    if (clientId && windowOf(clientId)) {
      trackClientWindow(
        clientId,
        materials.map((m) => m.id),
      );
    }
    afterWrite();
  }
  return { materials, failed };
}

type CatalogWriteEdges = Parameters<typeof writeCatalog>[1]["edges"] & object;

export async function updateMaterial(input: UpdateMaterialInput): Promise<void> {
  const workspace = await ready();
  if (!applyMaterialUpdate(workspace, input)) {
    throw new Error(`Material "${input.id}" not found`);
  }
  afterWrite();
}

export async function updateMaterialStock(
  input: UpdateMaterialStockInput,
): Promise<void> {
  const workspace = await ready();
  if (!applyStockUpdate(workspace, input.id, input.stock)) {
    throw new Error(`Material "${input.id}" not found`);
  }
  afterWrite();
}

export async function deleteMaterial(id: string): Promise<void> {
  const workspace = await ready();
  deleteMaterialRow(workspace, id);
  afterWrite();
}

export async function registerMaterialTypeVersion(
  input: MaterialTypeVersionDTO & { predecessorId?: string },
): Promise<void> {
  const workspace = await ready();
  registerTypeVersion(workspace, input);
  afterWrite();
}

export async function seedCatalogIfEmpty(
  input: SeedCatalogInput,
): Promise<{ seeded: boolean }> {
  const workspace = await ready();
  if (!catalogIsEmpty(workspace)) return { seeded: false };
  writeSeed(workspace, input);
  return { seeded: true };
}

/** Append-only bulk write. Fixture construction (e2e-tests.md §11.2). */
export async function appendCatalogChunk(
  input: SeedCatalogInput,
): Promise<{ materials: number }> {
  const workspace = await ready();
  writeSeed(workspace, input);
  return { materials: input.materials?.length ?? 0 };
}

function writeSeed(workspace: string, input: SeedCatalogInput): void {
  writeCatalog(workspace, {
    materials: input.materials ?? [],
    edges: input.edges ?? [],
    materialTypes: input.materialTypes ?? [],
    industries: input.industries ?? [],
    sellers: input.sellers ?? [],
  });
  afterWrite();
}

/** A workspace switch: the per-client cursors describe a catalog that is gone. */
export function resetCatalogClients(): void {
  dropAllWatermarks();
}
