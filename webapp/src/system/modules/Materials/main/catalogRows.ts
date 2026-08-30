/**
 * Turning catalog rows into DTOs, and queries into FTS expressions.
 *
 * Split out of `catalogDb.ts` so it depends on nothing but types: no database
 * handle, no `electron`. That is what lets these rules be unit-tested directly
 * — they are the part of the storage layer with actual decisions in it (what
 * an absent value looks like, what a query matches, what is searchable), and
 * they were previously reachable only by driving the whole app.
 */
import { buildHaystack } from "../shared/materialSearch";
import type { AttributeMap, MaterialDTO } from "../typings/catalog";

/** A `materials` row, as the queries select it. */
export interface MaterialRow {
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

/**
 * Decode a JSON attribute blob.
 *
 * Tolerant on purpose: a row whose JSON cannot be parsed renders as a material
 * with no attributes rather than taking down the page it appears on. The
 * column has a `json_valid` CHECK, so this is defence against a value that got
 * in some other way, not an expected path.
 */
export function parseAttributeMap(json: string): AttributeMap {
  if (!json) return {};
  try {
    return JSON.parse(json) as AttributeMap;
  } catch {
    return {};
  }
}

/**
 * A stored row as the renderer's DTO.
 *
 * `id` is the **domain** id (`material_key`), never the storage UUID: the
 * UUID is replication's business and must not leave this layer. Empty strings
 * decode back to absent fields, because the schema has no nullable columns
 * (cr-sqlite forbids them) and `''` is how absence is spelled.
 */
export function rowToDto(row: MaterialRow): MaterialDTO {
  const dto: MaterialDTO = {
    id: row.material_key,
    type: row.type,
    position: { x: row.pos_x, y: row.pos_y },
    attributes: parseAttributeMap(row.attrs_json),
    stock: { amount: row.stock_amount, unit: row.stock_unit },
    schemaVersion: row.schema_version,
    updatedAt: row.updated_at,
  };
  if (row.label) dto.label = row.label;
  if (row.external_id) dto.externalId = row.external_id;
  if (row.external_url) dto.externalURL = row.external_url;
  if (row.image_url) dto.imageURL = row.image_url;
  if (row.description) dto.description = row.description;
  if (row.composition_json) {
    dto.composition = parseAttributeMap(row.composition_json);
  }
  if (row.caracteristics_json) {
    dto.caracteristics = parseAttributeMap(row.caracteristics_json);
  }
  return dto;
}

/** JSON-decoded leaf of one attribute, or `undefined`. */
function attributeLeaf(attrs: AttributeMap | undefined, key: string): unknown {
  const attr = attrs?.[key];
  if (!attr || attr.valueJson === undefined) return undefined;
  try {
    return JSON.parse(attr.valueJson);
  } catch {
    return attr.valueJson;
  }
}

/**
 * The searchable fields a material carries in columns rather than in its blob.
 *
 * `nome` and `cor` live in `attributes`, so they are copied out on write. A
 * denormalisation with the usual cost: a writer that sets attributes without
 * going through here leaves the columns stale.
 */
export function searchableColumns(dto: Pick<MaterialDTO, "attributes">): {
  name: string;
  colorLabel: string;
} {
  const nome = attributeLeaf(dto.attributes, "nome");
  const cor = attributeLeaf(dto.attributes, "cor");
  const colorLabel =
    cor && typeof cor === "object"
      ? ((cor as { label?: string }).label ?? (cor as { hex?: string }).hex ?? "")
      : typeof cor === "string"
      ? cor
      : "";
  return {
    name: typeof nome === "string" ? nome : nome == null ? "" : String(nome),
    colorLabel: String(colorLabel ?? ""),
  };
}

/**
 * The searchable text for a row, from the same fields the grid renders.
 *
 * Built through `shared/materialSearch` so main and the renderer agree on what
 * "matches" means — the one thing that must not drift when the engine
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

/**
 * Turn a normalized user query into an FTS5 MATCH expression.
 *
 * Every token becomes a prefix term, ANDed — "royal lin" matches "linha
 * Royal". FTS5 syntax characters are stripped rather than escaped: a query is
 * a search box, not an expression language, and a stray quote must not throw.
 * An empty query yields `""`, which matches nothing — callers decide whether
 * an empty query means "everything" before they get here.
 */
export function ftsQuery(normalized: string): string {
  const tokens = normalized
    .replace(/["*()^:-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return '""';
  return tokens.map((t) => `"${t}"*`).join(" AND ");
}
