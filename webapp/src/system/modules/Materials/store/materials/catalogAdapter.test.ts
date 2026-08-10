/**
 * Unit tests for the catalog → slice adapter.
 *
 * These cover the two behaviours the perf work depends on being *unchanged*:
 * that edge-derived relations (`suppliers`, `industry`) still resolve after
 * the O(M×E) scan was replaced by an index, and that a delta applies exactly
 * the rows it names and nothing else.
 */
import {
  applyCatalogDelta,
  buildEdgeIndex,
  catalogToMaterialsState,
} from "./catalogAdapter";
import type {
  CatalogSnapshot,
  EdgeDTO,
  MaterialDTO,
} from "../../typings/catalog";

const material = (id: string, over: Partial<MaterialDTO> = {}): MaterialDTO => ({
  id,
  type: "malha",
  schemaVersion: "0.0.1",
  attributes: { nome: { key: "nome", valueJson: JSON.stringify(`M ${id}`) } },
  stock: { amount: 1, unit: "m" },
  updatedAt: 1,
  ...over,
});

const edge = (
  id: string,
  type: string,
  sourceId: string,
  targetId: string,
): EdgeDTO => ({ id, type, sourceId, targetId });

const snapshot = (): CatalogSnapshot => ({
  materials: { a: material("a"), b: material("b") },
  materialTypes: {},
  industries: {},
  sellers: {},
  edges: {
    "manufacturedBy:a": edge("manufacturedBy:a", "manufacturedBy", "a", "ind-1"),
    "suppliedBy:a:s1": edge("suppliedBy:a:s1", "suppliedBy", "a", "s1"),
    "suppliedBy:a:s2": edge("suppliedBy:a:s2", "suppliedBy", "a", "s2"),
    "manufacturedBy:b": edge("manufacturedBy:b", "manufacturedBy", "b", "ind-2"),
  },
});

describe("buildEdgeIndex", () => {
  it("buckets edges by sourceId", () => {
    const index = buildEdgeIndex(Object.values(snapshot().edges));
    expect(index.get("a")).toHaveLength(3);
    expect(index.get("b")).toHaveLength(1);
    expect(index.get("nobody")).toBeUndefined();
  });
});

describe("catalogToMaterialsState", () => {
  it("derives industry and suppliers from the edge set", () => {
    const state = catalogToMaterialsState(snapshot());
    expect(state.a.industry).toBe("ind-1");
    expect(state.a.suppliers).toEqual(["s1", "s2"]);
    expect(state.b.industry).toBe("ind-2");
    expect(state.b.suppliers).toEqual([]);
  });

  it("decodes JSON attribute leaves", () => {
    const state = catalogToMaterialsState(snapshot());
    expect(state.a.attributes.nome).toBe("M a");
  });

  it("leaves industry empty when no manufacturedBy edge exists", () => {
    const snap = snapshot();
    delete snap.edges["manufacturedBy:b"];
    expect(catalogToMaterialsState(snap).b.industry).toBe("");
  });
});

describe("applyCatalogDelta", () => {
  const base = () => catalogToMaterialsState(snapshot());

  it("replaces everything on a full payload", () => {
    const snap = snapshot();
    snap.materials = { c: material("c") };
    snap.edges = {};
    const next = applyCatalogDelta(base(), { full: snap });
    expect(Object.keys(next)).toEqual(["c"]);
  });

  it("returns the same reference when nothing moved", () => {
    const state = base();
    expect(applyCatalogDelta(state, {})).toBe(state);
  });

  it("re-derives only the named material", () => {
    const state = base();
    const next = applyCatalogDelta(state, {
      materials: { a: material("a", { updatedAt: 2, stock: { amount: 9, unit: "m" } }) },
      edges: {
        "manufacturedBy:a": edge("manufacturedBy:a", "manufacturedBy", "a", "ind-9"),
      },
    });
    expect(next.a.stock.amount).toBe(9);
    expect(next.a.industry).toBe("ind-9");
    // Untouched rows keep their identity, so id-scoped subscribers don't
    // re-render because a neighbour changed.
    expect(next.b).toBe(state.b);
  });

  it("drops removed materials", () => {
    const next = applyCatalogDelta(base(), { removedMaterials: ["b"] });
    expect(next.b).toBeUndefined();
    expect(next.a).toBeDefined();
  });

  it("recomputes relations from the delta's full edge set for that material", () => {
    // The delta carries every current edge of a changed material, not only the
    // one that moved — otherwise dropping one supplier would drop them all.
    const next = applyCatalogDelta(base(), {
      materials: { a: material("a", { updatedAt: 3 }) },
      edges: {
        "manufacturedBy:a": edge("manufacturedBy:a", "manufacturedBy", "a", "ind-1"),
        "suppliedBy:a:s2": edge("suppliedBy:a:s2", "suppliedBy", "a", "s2"),
      },
      removedEdges: ["suppliedBy:a:s1"],
    });
    expect(next.a.suppliers).toEqual(["s2"]);
    expect(next.a.industry).toBe("ind-1");
  });
});
