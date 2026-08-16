/**
 * The catalog → Graph-module translation.
 *
 * The rules under test are the ones that decide whether the graph stays a
 * faithful, *bounded* view of the mirror: pages merge, resets replace,
 * endpoints always exist, and reclaimed materials take their relations with
 * them.
 */
import {
  applyCatalogGraph,
  catalogWindowGraph,
  CATALOG_GRAPH_ID,
  CATALOG_NODE_TYPES,
  emptyCatalogGraph,
  pruneCatalogGraph,
} from "./catalogGraph";
import type { CatalogWindow, EdgeDTO, MaterialDTO } from "../../typings/catalog";

const material = (id: string, nome = id): MaterialDTO =>
  ({
    id,
    type: "malha",
    schemaVersion: "0.0.1",
    attributes: { nome: { key: "nome", valueJson: JSON.stringify(nome) } },
    stock: { amount: 0, unit: "m" },
    externalId: id,
    updatedAt: 1,
    position: { x: 0, y: 0 },
  }) as MaterialDTO;

const edge = (
  id: string,
  type: string,
  sourceId: string,
  targetId: string,
): EdgeDTO => ({ id, type, sourceId, targetId }) as EdgeDTO;

const windowPayload = (over: Partial<CatalogWindow> = {}): CatalogWindow =>
  ({
    materials: {},
    edges: {},
    materialTypes: {},
    industries: {},
    sellers: {},
    page: [],
    pinned: [],
    offset: 0,
    limit: 100,
    matched: 0,
    total: 0,
    hasMore: false,
    query: "",
    reset: false,
    mode: "rank",
    ...over,
  }) as CatalogWindow;

describe("applyCatalogGraph", () => {
  it("derives nodes, edges and adjacency from a payload", () => {
    const graph = applyCatalogGraph(
      undefined,
      {
        materials: { m1: material("m1", "Malha azul") },
        edges: {
          e1: edge("e1", "manufacturedBy", "m1", "ind-1"),
          e2: edge("e2", "conformsTo", "m1", "malha@0.0.1"),
        },
      },
      { replace: true },
    );

    expect(graph.id).toBe(CATALOG_GRAPH_ID);
    expect(graph.nodes.m1.label).toBe("Malha azul");
    expect(graph.nodes.m1.type).toBe(CATALOG_NODE_TYPES.material);
    // Endpoints with no DTO in the payload still become nodes, typed by the
    // edge that reached them — otherwise adjacency would name a vertex that
    // does not exist.
    expect(graph.nodes["ind-1"].type).toBe(CATALOG_NODE_TYPES.industry);
    expect(graph.nodes["malha@0.0.1"].type).toBe(CATALOG_NODE_TYPES.materialType);
    expect(graph.adjacencyList.m1.outputs.sort()).toEqual(["e1", "e2"]);
    expect(graph.adjacencyList["ind-1"].inputs).toEqual(["e1"]);
  });

  it("merges a page into what is already there", () => {
    const first = applyCatalogGraph(
      undefined,
      { materials: { m1: material("m1") }, edges: { e1: edge("e1", "manufacturedBy", "m1", "ind-1") } },
      { replace: true },
    );
    const second = catalogWindowGraph(
      first,
      windowPayload({
        materials: { m2: material("m2") },
        edges: { e2: edge("e2", "manufacturedBy", "m2", "ind-1") },
      }),
    );

    expect(Object.keys(second.edges).sort()).toEqual(["e1", "e2"]);
    expect(Object.keys(second.nodes).sort()).toEqual(["ind-1", "m1", "m2"]);
    expect(second.adjacencyList["ind-1"].inputs.sort()).toEqual(["e1", "e2"]);
  });

  it("replaces on a reset read — the previous workspace must not survive", () => {
    const first = applyCatalogGraph(
      undefined,
      { materials: { old: material("old") }, edges: { e1: edge("e1", "manufacturedBy", "old", "ind-0") } },
      { replace: true },
    );
    const next = catalogWindowGraph(
      first,
      windowPayload({
        reset: true,
        materials: { m1: material("m1") },
        edges: { e2: edge("e2", "manufacturedBy", "m1", "ind-1") },
      }),
    );

    expect(Object.keys(next.edges)).toEqual(["e2"]);
    expect(next.nodes.old).toBeUndefined();
  });

  it("drops edges a delta removed", () => {
    const first = applyCatalogGraph(
      undefined,
      { edges: { e1: edge("e1", "suppliedBy", "m1", "s1"), e2: edge("e2", "suppliedBy", "m1", "s2") } },
      { replace: true },
    );
    const next = applyCatalogGraph(first, {}, { removedEdges: ["e1"] });

    expect(Object.keys(next.edges)).toEqual(["e2"]);
    expect(next.adjacencyList.m1.outputs).toEqual(["e2"]);
  });

  it("returns the same graph when a merge changes nothing", () => {
    const first = applyCatalogGraph(
      undefined,
      { materials: { m1: material("m1") }, edges: { e1: edge("e1", "suppliedBy", "m1", "s1") } },
      { replace: true },
    );

    expect(applyCatalogGraph(first, {})).toBe(first);
    expect(catalogWindowGraph(first, windowPayload())).toBe(first);
  });

  it("takes a node-only payload — a row resolved before it has edges", () => {
    const next = applyCatalogGraph(emptyCatalogGraph(), {
      materials: { m1: material("m1") },
    });

    expect(next.nodes.m1).toBeDefined();
    expect(next.edges).toEqual({});
  });
});

describe("pruneCatalogGraph", () => {
  const base = () =>
    applyCatalogGraph(
      undefined,
      {
        materials: { m1: material("m1"), m2: material("m2") },
        edges: {
          e1: edge("e1", "manufacturedBy", "m1", "ind-1"),
          e2: edge("e2", "manufacturedBy", "m2", "ind-1"),
        },
      },
      { replace: true },
    );

  it("drops a reclaimed material with its relations", () => {
    const next = pruneCatalogGraph(base(), ["m1"])!;

    expect(next.nodes.m1).toBeUndefined();
    expect(Object.keys(next.edges)).toEqual(["e2"]);
    expect(next.adjacencyList["ind-1"].inputs).toEqual(["e2"]);
    // Organizations are shared and bounded — they stay, or the next page
    // would only have to re-create them.
    expect(next.nodes["ind-1"]).toBeDefined();
  });

  it("returns the same graph when it holds none of them", () => {
    const graph = base();

    expect(pruneCatalogGraph(graph, ["nobody"])).toBe(graph);
    expect(pruneCatalogGraph(graph, [])).toBe(graph);
  });
});
