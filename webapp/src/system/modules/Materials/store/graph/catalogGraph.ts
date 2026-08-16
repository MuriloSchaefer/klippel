/**
 * The catalog's relation graph, in the shape the **Graph module** owns.
 *
 * Materials, the types they conform to, and the organizations that make and
 * sell them are a graph, and the app already has a module for graphs. This
 * file is the translation layer: catalog payloads in, a `GraphState` out,
 * which the middleware hands to `loadGraph`. The Materials slice keeps no
 * graph of its own — there is exactly one place graphs live.
 *
 * Pure: no store, no dispatch, no `window`. Everything here is a function of
 * its arguments, which is what makes the merge rules testable.
 */
import type {
  AdjacencyList,
  GraphState,
  NodeConnections,
} from "@kernel/modules/Graphs/store/state";
import type { Edge } from "@kernel/modules/Graphs/interfaces/Edge";
import type { Node } from "@kernel/modules/Graphs/interfaces/Node";

import type {
  CatalogSnapshot,
  CatalogWindow,
  EdgeDTO,
  MaterialDTO,
  MaterialTypeVersionDTO,
  OrgNodeDTO,
} from "../../typings/catalog";

/** The one graph id the catalog uses. */
export const CATALOG_GRAPH_ID = "materials-catalog";

/**
 * Node types. The catalog's vertices are not all materials — an edge's target
 * is a type version or an organization — so the graph names what each one is
 * rather than leaving consumers to infer it from the edge that reached it.
 */
export const CATALOG_NODE_TYPES = {
  material: "MATERIAL",
  materialType: "MATERIAL_TYPE",
  industry: "INDUSTRY",
  seller: "SELLER",
} as const;

/** Which node type an edge's *target* is, by edge type. */
const TARGET_NODE_TYPE: { [edgeType: string]: string } = {
  conformsTo: CATALOG_NODE_TYPES.materialType,
  manufacturedBy: CATALOG_NODE_TYPES.industry,
  suppliedBy: CATALOG_NODE_TYPES.seller,
};

const ORIGIN = { x: 0, y: 0 };

const node = (id: string, type: string, label?: string): Node => ({
  id,
  type,
  ...(label ? { label } : {}),
  position: ORIGIN,
});

const materialLabel = (dto: MaterialDTO): string | undefined => {
  const nome = (dto.attributes as Record<string, { valueJson?: string }> | undefined)
    ?.nome?.valueJson;
  if (!nome) return dto.externalId || undefined;
  try {
    const parsed = JSON.parse(nome);
    return typeof parsed === "string" ? parsed : String(parsed);
  } catch {
    return nome;
  }
};

export interface CatalogGraphInput {
  materials?: { [id: string]: MaterialDTO };
  edges?: { [id: string]: EdgeDTO };
  materialTypes?: { [id: string]: MaterialTypeVersionDTO };
  industries?: { [id: string]: OrgNodeDTO };
  sellers?: { [id: string]: OrgNodeDTO };
}

/** An empty graph carrying the catalog's id — the reset value. */
export const emptyCatalogGraph = (): GraphState => ({
  id: CATALOG_GRAPH_ID,
  nodes: {},
  edges: {},
  adjacencyList: {},
  searchResults: {},
});

/**
 * `sourceId → outputs`, `targetId → inputs`, derived from the edge set.
 *
 * Rebuilt in full on every change rather than patched: it is one linear pass
 * over the edges, and a targeted rebuild would have to rescan every edge of
 * each touched endpoint anyway.
 */
function buildAdjacency(edges: { [id: string]: Edge }): AdjacencyList {
  const out: AdjacencyList = {};
  const bucket = (id: string): NodeConnections =>
    (out[id] ??= { inputs: [], outputs: [] });
  for (const edge of Object.values(edges)) {
    bucket(edge.sourceId).outputs.push(edge.id);
    bucket(edge.targetId).inputs.push(edge.id);
  }
  return out;
}

/** Nodes implied by a payload: its materials, plus every edge endpoint. */
function nodesFrom(
  input: CatalogGraphInput,
  edges: { [id: string]: Edge },
): { [id: string]: Node } {
  const nodes: { [id: string]: Node } = {};

  for (const dto of Object.values(input.materials ?? {})) {
    nodes[dto.id] = node(dto.id, CATALOG_NODE_TYPES.material, materialLabel(dto));
  }
  for (const dto of Object.values(input.materialTypes ?? {})) {
    nodes[dto.id] = node(dto.id, CATALOG_NODE_TYPES.materialType, dto.id);
  }
  for (const dto of Object.values(input.industries ?? {})) {
    nodes[dto.id] = node(dto.id, CATALOG_NODE_TYPES.industry, dto.name);
  }
  for (const dto of Object.values(input.sellers ?? {})) {
    nodes[dto.id] = node(dto.id, CATALOG_NODE_TYPES.seller, dto.name);
  }
  // An endpoint with no DTO in this payload still has to exist as a node, or
  // the edge would dangle and adjacency would describe a vertex nothing
  // names. It gets its type from the edge that reached it.
  for (const edge of Object.values(edges)) {
    nodes[edge.sourceId] ??= node(edge.sourceId, CATALOG_NODE_TYPES.material);
    nodes[edge.targetId] ??= node(
      edge.targetId,
      TARGET_NODE_TYPE[edge.type] ?? "UNKNOWN",
    );
  }
  return nodes;
}

const toEdges = (edges: { [id: string]: EdgeDTO } | undefined): {
  [id: string]: Edge;
} => {
  const out: { [id: string]: Edge } = {};
  for (const [id, dto] of Object.entries(edges ?? {})) {
    out[id] = { id: dto.id ?? id, type: dto.type, sourceId: dto.sourceId, targetId: dto.targetId };
  }
  return out;
};

/**
 * Fold a catalog payload into the graph.
 *
 * `replace` is the `reset` / snapshot case: the client is starting over, so
 * the previous workspace's vertices must not survive. Otherwise the payload
 * merges — a page carries every current edge of the materials *in it*, which
 * makes those materials' relations complete and says nothing about anyone
 * else's.
 *
 * Returns the same reference when a merge changes nothing, so the store does
 * not notify subscribers for a no-op tick.
 */
export function applyCatalogGraph(
  current: GraphState | undefined,
  input: CatalogGraphInput,
  options: { replace?: boolean; removedEdges?: string[] } = {},
): GraphState {
  const base = current ?? emptyCatalogGraph();
  const incomingEdges = toEdges(input.edges);
  const removed = options.removedEdges ?? [];

  if (!options.replace && !Object.keys(incomingEdges).length && !removed.length) {
    // Node-only payloads (a by-id resolve of a row with no edges yet) still
    // matter: without the node the next edge to reach it would dangle.
    const incomingNodes = nodesFrom(input, {});
    const newIds = Object.keys(incomingNodes).filter((id) => !base.nodes[id]);
    if (!newIds.length) return base;
    return {
      ...base,
      nodes: { ...base.nodes, ...incomingNodes },
    };
  }

  const edges = options.replace
    ? incomingEdges
    : { ...base.edges, ...incomingEdges };
  for (const id of removed) delete edges[id];

  const nodes = options.replace
    ? nodesFrom(input, edges)
    : { ...base.nodes, ...nodesFrom(input, edges) };

  return {
    id: CATALOG_GRAPH_ID,
    nodes,
    edges,
    adjacencyList: buildAdjacency(edges),
    // Search results are the Graph module's own concern and are invalidated
    // by its actions; a catalog refresh has no opinion about them.
    searchResults: base.searchResults ?? {},
  };
}

/** The graph for a whole-catalog snapshot — always a replacement. */
export const catalogSnapshotGraph = (snapshot: CatalogSnapshot): GraphState =>
  applyCatalogGraph(undefined, snapshot as CatalogGraphInput, { replace: true });

/** The graph after one window page. `reset` replaces, anything else merges. */
export const catalogWindowGraph = (
  current: GraphState | undefined,
  window: CatalogWindow,
): GraphState =>
  applyCatalogGraph(current, window as CatalogGraphInput, {
    replace: window.reset,
  });

/**
 * Drop vertices the mirror no longer holds, with the edges that touched them.
 *
 * The graph mirrors the mirror: when the residency sweep reclaims a material,
 * its relations go too. Without this the graph would be the one structure
 * that still grew with everything the user ever scrolled past — the exact
 * leak windowing exists to prevent, moved one slice sideways.
 *
 * Only *material* vertices are dropped. Types and organizations are bounded
 * by how many exist, are shared by many materials, and arrive whole with
 * every page; pruning them per material would just make the next page
 * re-create them.
 */
export function pruneCatalogGraph(
  current: GraphState | undefined,
  removedMaterialIds: readonly string[],
): GraphState | undefined {
  if (!current || !removedMaterialIds.length) return current;
  const gone = new Set(removedMaterialIds);
  const doomedNodeIds = Object.keys(current.nodes).filter((id) => gone.has(id));
  const doomedEdges = Object.values(current.edges).filter(
    (e) => gone.has(e.sourceId) || gone.has(e.targetId),
  );
  if (!doomedNodeIds.length && !doomedEdges.length) return current;

  const edges = { ...current.edges };
  for (const edge of doomedEdges) delete edges[edge.id];
  const nodes = { ...current.nodes };
  for (const id of gone) delete nodes[id];

  return {
    ...current,
    nodes,
    edges,
    adjacencyList: buildAdjacency(edges),
  };
}
