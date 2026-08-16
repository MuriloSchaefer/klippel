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
  CatalogWindow,
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
 * Rows the mirror does not hold are **skipped**, not added: membership is
 * decided by window reads and by the residency sweep, never by a tick.
 *
 * Returns `state` unchanged — same reference — when the delta is empty or
 * names nothing resident, so a no-op tick costs nothing downstream.
 */
export function applyCatalogDelta(
  state: MaterialsState,
  delta: CatalogDelta,
): MaterialsState {
  if (delta.full) {
    // A snapshot arriving on a *tick* refreshes the mirror; it does not
    // become it. Main only sends one when it has no usable "since", and a
    // windowed client in that position (a workspace switch drops its
    // recorded window, and any write before its first window read lands in
    // the gap) would otherwise swallow the entire catalog into Redux —
    // silently undoing windowing, which is exactly what one probe of a
    // 1 000-row seed caught: 100 rows in the view, 1 003 in the mirror.
    //
    // The explicit whole-catalog load has its own action
    // (`materialsCatalogLoaded`) and still replaces; that is the perf
    // harness's path, and it means what it says.
    // Derived per resident row, not by projecting the snapshot and throwing
    // most of it away: the work is O(mirror), not O(catalog).
    const index = buildEdgeIndex(Object.values(delta.full.edges));
    const next: MaterialsState = {};
    let moved = false;
    for (const id of Object.keys(state)) {
      const dto = delta.full.materials[id];
      // Absent from an authoritative snapshot ⇒ the row is gone.
      if (!dto) {
        moved = true;
        continue;
      }
      next[id] = materialDtoToState(dto, index);
      moved = true;
    }
    return moved ? next : state;
  }

  const changed = Object.values(delta.materials ?? {});
  const removed = delta.removedMaterials ?? [];
  if (!changed.length && !removed.length) return state;

  const index = buildEdgeIndex(Object.values(delta.edges ?? {}));
  const next: MaterialsState = { ...state };
  let moved = false;
  for (const dto of changed) {
    // Only rows the mirror already holds. A delta is scoped to what main
    // believes this client mirrors, and eviction has made that a superset:
    // taking every row it names would quietly re-admit the rows the
    // residency sweep just reclaimed, once per tick, until the mirror was
    // the whole catalog again. A row that belongs on screen comes back
    // through a window read, which is the only thing that decides membership.
    if (!(dto.id in state)) continue;
    next[dto.id] = materialDtoToState(dto, index);
    moved = true;
  }
  for (const id of removed) {
    if (!(id in next)) continue;
    delete next[id];
    moved = true;
  }
  return moved ? next : state;
}

/**
 * Fold one page of the catalog into the materials slice.
 *
 * Merges by default: a page is an *addition* to the mirror. Replacing would
 * evict the rows an open model pinned as soon as the user scrolled, and would
 * make a by-id resolve for one graph node throw away the stock grid's page.
 *
 * `reset` is the exception, and means what it says on the main side: the
 * client is starting over (cold open, workspace switch), so rows from before
 * must not survive — a stale row from another workspace is worse than an
 * absent one.
 *
 * Rows the page carries get a new object identity, so their subscribers
 * re-render; rows it does not mention keep theirs and do not. Returns the
 * same state reference when the page carries nothing.
 */
export function applyCatalogWindow(
  state: MaterialsState,
  window: CatalogWindow,
): MaterialsState {
  const incoming = Object.values(window.materials);
  if (!window.reset && !incoming.length) return state;

  const index = buildEdgeIndex(Object.values(window.edges));
  const next: MaterialsState = window.reset ? {} : { ...state };
  for (const dto of incoming) {
    next[dto.id] = materialDtoToState(dto, index);
  }
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
