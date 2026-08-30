/**
 * The materials catalog, answered from SQLite.
 *
 * Replaces the read half of `materials.ts`: every question the renderer asks —
 * a ranked page, a search, a type's rows, a row by id — is an indexed query
 * here instead of a whole-catalog CoValue resolve. The IPC contract and the
 * DTOs are unchanged, which is what lets this land behind the existing
 * renderer (`docs/architecture/catalog-mirror.md` still holds in full).
 *
 * **Two identities, deliberately.** Rows are keyed in storage by a UUID
 * derived from their domain id (`electron/main/db/ids.ts`), because that is
 * what replication needs; the domain id lives in a `*_key` column and is what
 * every DTO carries as `id`. This module is the boundary: UUIDs never leave
 * it, and callers only ever pass domain ids in.
 *
 * Cost, measured at 100k materials (`scripts/devtools/catalog-sqlite-bench.mjs`):
 * a ranked page is 0.35 ms and a row by id 0.025 ms, neither growing with the
 * catalog. The shape it replaces was 3 300 ms and linear.
 */
import type { Database as Db } from "better-sqlite3";

import { prepare, workspaceDb } from "../../../../../electron/main/db";
import { SQL, idSet } from "./queries";
import { buildHaystack, normalizeQuery } from "../shared/materialSearch";
import type {
  AttributeMap,
  CatalogWindow,
  CatalogWindowRequest,
  EdgeDTO,
  MaterialDTO,
  MaterialTypeVersionDTO,
  OrgNodeDTO,
} from "../typings/catalog";

/** Default page size — "100 more frequently used" from the product ask. */
export const DEFAULT_WINDOW_LIMIT = 100;
/** Ceiling on one page; a caller asking for everything is asking wrongly. */
const MAX_WINDOW_LIMIT = 1_000;
interface MaterialRow {
  id: string;
  material_key: string;
  type: string;
  label: string;
  external_id: string;
  external_url: string;
  image_url: string;
  description: string;
  schema_version: string;
  name: string;
  color_label: string;
  industry: string;
  stock_amount: number;
  stock_unit: string;
  pos_x: number;
  pos_y: number;
  attrs_json: string;
  composition_json: string;
  caracteristics_json: string;
  updated_at: number;
}

const parseMap = (json: string): AttributeMap => {
  if (!json) return {};
  try {
    return JSON.parse(json) as AttributeMap;
  } catch {
    return {};
  }
};

/** A stored row as the renderer's DTO. Empty strings decode back to absent. */
export function rowToDto(row: MaterialRow): MaterialDTO {
  const dto: MaterialDTO = {
    // The domain id, never the storage UUID.
    id: row.material_key,
    type: row.type,
    position: { x: row.pos_x, y: row.pos_y },
    attributes: parseMap(row.attrs_json),
    stock: { amount: row.stock_amount, unit: row.stock_unit },
    schemaVersion: row.schema_version,
    updatedAt: row.updated_at,
  };
  if (row.label) dto.label = row.label;
  if (row.external_id) dto.externalId = row.external_id;
  if (row.external_url) dto.externalURL = row.external_url;
  if (row.image_url) dto.imageURL = row.image_url;
  if (row.description) dto.description = row.description;
  if (row.composition_json) dto.composition = parseMap(row.composition_json);
  if (row.caracteristics_json) {
    dto.caracteristics = parseMap(row.caracteristics_json);
  }
  return dto;
}

interface OrgRow {
  org_key: string;
  type: string;
  label: string;
  name: string;
  country: string;
  contact: string;
  pos_x: number;
  pos_y: number;
  updated_at: number;
}

const orgToDto = (row: OrgRow): OrgNodeDTO => {
  const dto: OrgNodeDTO = {
    id: row.org_key,
    type: row.type,
    name: row.name,
    position: { x: row.pos_x, y: row.pos_y },
    updatedAt: row.updated_at,
  };
  if (row.label) dto.label = row.label;
  if (row.country) dto.country = row.country;
  if (row.contact) dto.contact = row.contact;
  return dto;
};

/**
 * The searchable text for a row, from the same fields the grid renders.
 *
 * Shared with the renderer through `shared/materialSearch` so both sides agree
 * on what "matches" means — the one thing that must not drift when the engine
 * underneath changes.
 */
export function haystackForRow(row: {
  name: string;
  color_label: string;
  type: string;
  industry: string;
  external_id: string;
}): string {
  return buildHaystack({
    nome: row.name || undefined,
    corLabel: row.color_label || undefined,
    typeLabel: row.type,
    industry: row.industry || undefined,
    externalId: row.external_id || undefined,
  });
}

const dbFor = (workspace: string): Db => workspaceDb(workspace).db;

/** Everything bounded by "how many exist", carried whole by every answer. */
function boundedSets(
  db: Db,
): Pick<CatalogWindow, "materialTypes" | "industries" | "sellers"> {
  const materialTypes: { [id: string]: MaterialTypeVersionDTO } = {};
  for (const row of prepare(db, SQL.selectTypes).all() as Array<{
    type_key: string;
    schema_json: string;
  }>) {
    materialTypes[row.type_key] = {
      id: row.type_key,
      schemaJson: row.schema_json,
    };
  }

  const industries: { [id: string]: OrgNodeDTO } = {};
  const sellers: { [id: string]: OrgNodeDTO } = {};
  for (const row of prepare(db, SQL.selectOrganizations).all() as OrgRow[]) {
    const dto = orgToDto(row);
    if (row.type === "seller") sellers[row.org_key] = dto;
    else industries[row.org_key] = dto;
  }
  return { materialTypes, industries, sellers };
}

/** Every edge of the given materials, keyed by the edge's domain id. */
function edgesFor(db: Db, materialKeys: string[]): { [id: string]: EdgeDTO } {
  const edges: { [id: string]: EdgeDTO } = {};
  if (!materialKeys.length) return edges;
  const rows = prepare(db, SQL.selectEdgesBySource).all(
    idSet(materialKeys),
  ) as Array<{
    edge_key: string;
    source_key: string;
    type: string;
    target_id: string;
  }>;
  for (const e of rows) {
    edges[e.edge_key] = {
      id: e.edge_key,
      type: e.type,
      sourceId: e.source_key,
      targetId: e.target_id,
    };
  }
  return edges;
}

function materialsByKeys(db: Db, keys: string[]): Map<string, MaterialDTO> {
  const out = new Map<string, MaterialDTO>();
  const rows = prepare(db, SQL.selectMaterialsByKeys).all(
    idSet(keys),
  ) as MaterialRow[];
  for (const row of rows) out.set(row.material_key, rowToDto(row));
  return out;
}

/**
 * One page of the catalog.
 *
 * Same three addressing modes as before (`CatalogWindowRequest`) and the same
 * contract: pinned rows always ride along, types / industries / sellers come
 * whole, and the ranking is a total order (usage desc, key asc) so paging
 * neither skips nor repeats.
 */
export function loadWindow(
  workspace: string,
  request: CatalogWindowRequest,
): CatalogWindow {
  const db = dbFor(workspace);
  const limit = Math.min(
    Math.max(1, request.limit ?? DEFAULT_WINDOW_LIMIT),
    MAX_WINDOW_LIMIT,
  );
  const offset = Math.max(0, request.offset ?? 0);
  const query = normalizeQuery(request.query);
  const reset = request.reset === true;

  const total = (prepare(db, SQL.countMaterials).get() as { n: number }).n;

  let mode: CatalogWindow["mode"];
  let page: string[];
  let matched: number;

  if (request.ids) {
    // By-id resolve — the lazy path a graph node takes for a material the
    // window has not reached. Not paged: the caller knows what it wants.
    mode = "ids";
    const found = new Set(
      (
        prepare(db, SQL.selectExistingKeys).all(idSet(request.ids)) as Array<{
          material_key: string;
        }>
      ).map((r) => r.material_key),
    );
    page = request.ids.filter((id) => found.has(id));
    matched = page.length;
  } else if (query) {
    mode = request.type ? "type" : "search";
    // Search runs here, over every row, never in the renderer — the rule that
    // survives the storage change intact. FTS5 ranks by relevance; the usage
    // order breaks ties so a search page is stable under paging.
    const rows = (
      request.type
        ? prepare(db, SQL.searchRankedByType).all(ftsQuery(query), request.type)
        : prepare(db, SQL.searchRanked).all(ftsQuery(query))
    ) as Array<{ key: string }>;
    matched = rows.length;
    page = rows.slice(offset, offset + limit).map((r) => r.key);
  } else if (request.type) {
    mode = "type";
    matched = (
      prepare(db, SQL.countByType).get(request.type) as { n: number }
    ).n;
    page = (
      prepare(db, SQL.pageByType).all(request.type, limit, offset) as Array<{
        key: string;
      }>
    ).map((r) => r.key);
  } else {
    mode = "rank";
    matched = total;
    page = (
      prepare(db, SQL.pageRanked).all(limit, offset) as Array<{ key: string }>
    ).map((r) => r.key);
  }

  const pageSet = new Set(page);
  const requestedPins = (request.pinnedIds ?? []).filter((id) => !pageSet.has(id));
  const pinnedRows = requestedPins.length
    ? materialsByKeys(db, requestedPins)
    : new Map<string, MaterialDTO>();
  const pinned = requestedPins.filter((id) => pinnedRows.has(id));

  const pageRows = materialsByKeys(db, page);
  const materials: { [id: string]: MaterialDTO } = {};
  for (const id of page) {
    const dto = pageRows.get(id);
    if (dto) materials[id] = dto;
  }
  for (const id of pinned) {
    const dto = pinnedRows.get(id);
    if (dto) materials[id] = dto;
  }

  return {
    materials,
    edges: edgesFor(db, Object.keys(materials)),
    ...boundedSets(db),
    page,
    pinned,
    offset,
    limit,
    matched,
    total,
    hasMore: mode === "ids" ? false : offset + page.length < matched,
    query: request.query ?? "",
    reset,
    mode,
    type: request.type,
  };
}

/**
 * Turn a user query into an FTS5 MATCH expression.
 *
 * Every token becomes a prefix term, ANDed — "royal lin" matches "linha Royal"
 * — which is close to the subsequence scorer users learned, and unlike it,
 * indexed. FTS5 syntax characters are stripped rather than escaped: a query is
 * a search box, not an expression language, and a stray quote must not throw.
 */
export function ftsQuery(normalized: string): string {
  const tokens = normalized
    .replace(/["*()^:-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return '""';
  return tokens.map((t) => `"${t}"*`).join(" AND ");
}

/** One material by its domain id, or `null`. The O(1) read path. */
export function getMaterialRow(
  workspace: string,
  id: string,
): MaterialDTO | null {
  const row = prepare(dbFor(workspace), SQL.selectMaterialByKey).get(id) as
    | MaterialRow
    | undefined;
  return row ? rowToDto(row) : null;
}

/** How many materials the catalog holds. */
export function countMaterials(workspace: string): number {
  return (prepare(dbFor(workspace), SQL.countMaterials).get() as { n: number })
    .n;
}
