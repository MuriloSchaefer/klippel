/**
 * Unit tests for the catalog → slice adapter.
 *
 * These cover the behaviours the perf work depends on being *unchanged*: that
 * edge-derived relations (`suppliers`, `industry`) still resolve after the
 * O(M×E) scan was replaced by an index, and that a delta — and now a window
 * page — applies exactly the rows it names and nothing else.
 */
import {
  applyCatalogDelta,
  applyCatalogWindow,
  buildEdgeIndex,
  catalogToMaterialsState,
} from "./catalogAdapter";
import type {
  CatalogSnapshot,
  CatalogWindow,
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

/**
 * A window is a *page*, so the merge rules differ from a snapshot's in the
 * one way that matters: it must not be treated as authoritative for rows it
 * does not mention. These cases pin that, because getting it wrong is silent
 * — the grid still renders, just missing the rows an open model pinned.
 */
const windowPayload = (over: Partial<CatalogWindow> = {}): CatalogWindow => ({
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
});

describe("applyCatalogWindow", () => {
  const base = () => catalogToMaterialsState(snapshot());

  it("merges a page into the existing mirror", () => {
    const state = base();
    const next = applyCatalogWindow(
      state,
      windowPayload({ materials: { c: material("c") }, page: ["c"] }),
    );
    expect(Object.keys(next).sort()).toEqual(["a", "b", "c"]);
    // Rows the page did not mention keep their identity, so their
    // subscribers do not re-render.
    expect(next.a).toBe(state.a);
  });

  it("replaces the mirror on reset", () => {
    const next = applyCatalogWindow(
      base(),
      windowPayload({ materials: { c: material("c") }, page: ["c"], reset: true }),
    );
    expect(Object.keys(next)).toEqual(["c"]);
  });

  it("empties the mirror on a reset that carries nothing", () => {
    // A workspace switch into an empty catalog. Merging here would leave the
    // previous workspace's rows on screen.
    expect(applyCatalogWindow(base(), windowPayload({ reset: true }))).toEqual({});
  });

  it("returns the same reference for an empty non-reset page", () => {
    const state = base();
    expect(applyCatalogWindow(state, windowPayload())).toBe(state);
  });

  it("derives relations from the page's edge set", () => {
    const next = applyCatalogWindow(
      {},
      windowPayload({
        materials: { c: material("c") },
        page: ["c"],
        edges: {
          "manufacturedBy:c": edge("manufacturedBy:c", "manufacturedBy", "c", "ind-9"),
          "suppliedBy:c:s7": edge("suppliedBy:c:s7", "suppliedBy", "c", "s7"),
        },
      }),
    );
    expect(next.c.industry).toBe("ind-9");
    expect(next.c.suppliers).toEqual(["s7"]);
  });

  it("keeps pinned rows that arrive alongside a page", () => {
    // The pinned row is in `materials` but not in `page` — it belongs to an
    // open model, not to the grid's current page.
    const next = applyCatalogWindow(
      {},
      windowPayload({
        materials: { c: material("c"), z: material("z") },
        page: ["c"],
        pinned: ["z"],
      }),
    );
    expect(Object.keys(next).sort()).toEqual(["c", "z"]);
  });
});
