/**
 * Bridge between the per-CoValue catalog (`CatalogSnapshot`) and the
 * flattened `MaterialsState` the renderer-side slice and selectors
 * have used since before Jazz landed. Attribute leaves are
 * JSON-decoded back into plain values; industry / supplier strings
 * are reassembled from the edge records.
 *
 * Going the other way (`materialStateToDto`) is used by the Add /
 * Update form before it hands a payload to the main process.
 */
import type {
  AttributeDTO,
  AttributeMap,
  CatalogDelta,
  CatalogSnapshot,
  EdgeDTO,
  MaterialDTO,
} from "../../typings/catalog";
import type { MaterialState, MaterialsState } from "./state";

function decodeAttribute(attr: AttributeDTO): unknown {
  if (attr.children !== undefined) {
    return decodeAttributeMap(attr.children);
  }
  if (attr.valueJson === undefined) return undefined;
  try {
    return JSON.parse(attr.valueJson);
  } catch {
    return attr.valueJson;
  }
}

function decodeAttributeMap(map: AttributeMap): { [k: string]: unknown } {
  const out: { [k: string]: unknown } = {};
  for (const [k, v] of Object.entries(map)) {
    out[k] = decodeAttribute(v);
  }
  return out;
}

function encodeValue(value: unknown): AttributeDTO {
  // Always serialize to `valueJson`, including nested objects. The
  // earlier `children: AttributeRecord` shape produced a sub-CoMap
  // tree per attribute, which the catalog resolve set didn't deep-load
  // — peer B saw empty content for any nested attribute (cor,
  // gramatura, …). Flat JSON keeps sync trivial: each attribute is a
  // single CRDT cell with a string body. The decoder already handles
  // both shapes for backwards-compat with any pre-flat data still in
  // SQLite.
  return { key: "", valueJson: JSON.stringify(value) };
}

export function encodeAttributeMap(
  source: Record<string, unknown>,
): AttributeMap {
  const out: AttributeMap = {};
  for (const [k, v] of Object.entries(source)) {
    const encoded = encodeValue(v);
    out[k] = { ...encoded, key: k };
  }
  return out;
}

/**
 * `sourceId → edges` index. Built once per conversion, then read O(1) per
 * material.
 *
 * Both relations a material derives from its edges (`suppliedBy`,
 * `manufacturedBy`) are keyed on `sourceId === material.id`, so a single
 * bucket per source answers both. Before this index each material scanned
 * the whole edge array twice, making `catalogToMaterialsState` O(M×E) —
 * with ~3 edges per material that is quadratic, and measured 3.4 s for a
 * 10k catalog inside the reducer (docs/analysis/materials-catalog-lag-analysis.md).
 */
export type EdgeIndex = Map<string, EdgeDTO[]>;

export function buildEdgeIndex(edges: Iterable<EdgeDTO>): EdgeIndex {
  const index: EdgeIndex = new Map();
  for (const edge of edges) {
    const bucket = index.get(edge.sourceId);
    if (bucket) bucket.push(edge);
    else index.set(edge.sourceId, [edge]);
  }
  return index;
}

function relationsFor(
  materialId: string,
  index: EdgeIndex,
): { suppliers: string[]; industry: string } {
  const suppliers: string[] = [];
  let industry = "";
  for (const edge of index.get(materialId) ?? []) {
    if (edge.type === "suppliedBy") suppliers.push(edge.targetId);
    // First `manufacturedBy` wins, matching the previous `Array.find`.
    else if (edge.type === "manufacturedBy" && !industry) industry = edge.targetId;
  }
  return { suppliers, industry };
}

export function materialDtoToState(
  dto: MaterialDTO,
  edges: EdgeDTO[] | EdgeIndex,
): MaterialState {
  const index = edges instanceof Map ? edges : buildEdgeIndex(edges);
  const { suppliers, industry } = relationsFor(dto.id, index);
  return {
    id: dto.id,
    type: dto.type,
    schemaVersion: dto.schemaVersion,
    suppliers,
    industry,
    externalId: dto.externalId ?? "",
    externalURL: dto.externalURL,
    imageURL: dto.imageURL,
    description: dto.description,
    attributes: decodeAttributeMap(dto.attributes) as MaterialState["attributes"],
    caracteristics: dto.caracteristics
      ? (decodeAttributeMap(dto.caracteristics) as MaterialState["caracteristics"])
      : undefined,
    composition: dto.composition
      ? (decodeAttributeMap(dto.composition) as MaterialState["composition"])
      : undefined,
    stock: dto.stock as MaterialState["stock"],
  };
}

export function catalogToMaterialsState(
  snapshot: CatalogSnapshot,
): MaterialsState {
  const index = buildEdgeIndex(Object.values(snapshot.edges));
  const out: MaterialsState = {};
  for (const dto of Object.values(snapshot.materials)) {
    out[dto.id] = materialDtoToState(dto, index);
  }
  return out;
}

/**
 * Apply a change delta to the materials slice.
 *
 * Only the rows named in the delta are re-derived; everything else keeps its
 * identity, so consumers subscribed to a single material don't re-render
 * because an unrelated one moved. `delta.edges` carries every current edge of
 * the changed materials (see `CatalogDelta`), which is what makes deriving
 * `suppliers` / `industry` from it correct rather than partial.
 *
 * Returns `state` unchanged — same reference — when the delta is empty, so a
 * no-op tick costs nothing downstream.
 */
export function applyCatalogDelta(
  state: MaterialsState,
  delta: CatalogDelta,
): MaterialsState {
  if (delta.full) return catalogToMaterialsState(delta.full);

  const changed = Object.values(delta.materials ?? {});
  const removed = delta.removedMaterials ?? [];
  if (!changed.length && !removed.length) return state;

  const index = buildEdgeIndex(Object.values(delta.edges ?? {}));
  const next: MaterialsState = { ...state };
  for (const dto of changed) {
    next[dto.id] = materialDtoToState(dto, index);
  }
  for (const id of removed) delete next[id];
  return next;
}

export function materialStateToDto(state: MaterialState): MaterialDTO {
  return {
    id: String(state.id),
    type: state.type,
    attributes: encodeAttributeMap(
      state.attributes as Record<string, unknown>,
    ),
    stock: state.stock,
    composition: state.composition
      ? encodeAttributeMap(state.composition as Record<string, unknown>)
      : undefined,
    caracteristics: state.caracteristics
      ? encodeAttributeMap(state.caracteristics as Record<string, unknown>)
      : undefined,
    externalId: state.externalId,
    externalURL: state.externalURL,
    imageURL: state.imageURL,
    description: state.description,
    schemaVersion: state.schemaVersion,
    updatedAt: Date.now(),
    position: { x: 0, y: 0 },
  };
}
