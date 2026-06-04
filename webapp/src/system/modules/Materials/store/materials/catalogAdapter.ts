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

function suppliersFor(materialId: string, edges: EdgeDTO[]): string[] {
  return edges
    .filter((e) => e.type === "suppliedBy" && e.sourceId === materialId)
    .map((e) => e.targetId);
}

function industryFor(materialId: string, edges: EdgeDTO[]): string {
  const edge = edges.find(
    (e) => e.type === "manufacturedBy" && e.sourceId === materialId,
  );
  return edge?.targetId ?? "";
}

export function materialDtoToState(
  dto: MaterialDTO,
  edges: EdgeDTO[],
): MaterialState {
  return {
    id: dto.id,
    type: dto.type,
    schemaVersion: dto.schemaVersion,
    suppliers: suppliersFor(dto.id, edges),
    industry: industryFor(dto.id, edges),
    externalId: dto.externalId ?? "",
    externalURL: dto.externalURL,
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
  const edges = Object.values(snapshot.edges);
  const out: MaterialsState = {};
  for (const dto of Object.values(snapshot.materials)) {
    out[dto.id] = materialDtoToState(dto, edges);
  }
  return out;
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
    description: state.description,
    schemaVersion: state.schemaVersion,
    updatedAt: Date.now(),
    position: { x: 0, y: 0 },
  };
}
