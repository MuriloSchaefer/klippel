/**
 * Unit tests for mirror residency: what may be evicted, and how pins are
 * scoped to the tab that made them.
 *
 * These are the rules that decide whether the renderer's memory stays bounded
 * while browsing a large catalog, so they are asserted directly rather than
 * inferred from a rendered grid.
 */
import materialsSlice from "./slice";
import windowSlice from "../window/slice";
import { ADHOC_PIN_OWNER, initialState as windowInitialState } from "../window/state";
import {
  materialDeleted,
  materialsEvicted,
  materialsPinned,
  materialsUnpinned,
} from "./actions";
import {
  collectEvictable,
  DEFAULT_RESIDENCY_CONFIG,
  releaseMaterials,
  resetResidency,
  retainMaterials,
  setResidencyConfig,
  touchMaterials,
} from "./residency";
import type { MaterialState, MaterialsState } from "./state";

const material = (id: string): MaterialState => ({
  id,
  type: "tecido",
  schemaVersion: "tecido@1",
  suppliers: [],
  industry: "",
  externalId: id,
  attributes: {},
  stock: { amount: 0, unit: "m" },
});

const materialsReducer = materialsSlice.reducer;
const windowReducer = windowSlice.reducer;

beforeEach(() => {
  resetResidency();
  setResidencyConfig(DEFAULT_RESIDENCY_CONFIG);
});

describe("collectEvictable", () => {
  const NO_PROTECTION = new Set<string>();

  it("keeps rows the view or a tab still needs", () => {
    touchMaterials(["onscreen", "pinned"]);
    const protectedIds = new Set(["onscreen", "pinned"]);
    const at = Date.now() + DEFAULT_RESIDENCY_CONFIG.ttlMs * 10;

    expect(collectEvictable(["onscreen", "pinned"], protectedIds, at)).toEqual([]);
  });

  it("keeps a row something is rendering, however old the last read", () => {
    retainMaterials(["rendered"]);
    const at = Date.now() + DEFAULT_RESIDENCY_CONFIG.ttlMs * 10;

    expect(collectEvictable(["rendered"], NO_PROTECTION, at)).toEqual([]);
  });

  it("releases a row once its last reader unmounts and the TTL passes", () => {
    retainMaterials(["a"]);
    retainMaterials(["a"]); // two consumers of the same row
    releaseMaterials(["a"]);

    const justAfter = Date.now() + DEFAULT_RESIDENCY_CONFIG.ttlMs * 10;
    // Still held by the second consumer.
    expect(collectEvictable(["a"], NO_PROTECTION, justAfter)).toEqual([]);

    releaseMaterials(["a"]);
    expect(collectEvictable(["a"], NO_PROTECTION, justAfter)).toEqual(["a"]);
  });

  it("keeps a row read within the TTL and drops it after", () => {
    const now = Date.now();
    touchMaterials(["recent"]);

    expect(
      collectEvictable(["recent"], NO_PROTECTION, now + DEFAULT_RESIDENCY_CONFIG.ttlMs - 1),
    ).toEqual([]);
    expect(
      collectEvictable(["recent"], NO_PROTECTION, now + DEFAULT_RESIDENCY_CONFIG.ttlMs + 1),
    ).toEqual(["recent"]);
  });

  it("honours a reconfigured TTL", () => {
    setResidencyConfig({ ttlMs: 1_000 });
    const now = Date.now();
    touchMaterials(["short"]);

    expect(collectEvictable(["short"], NO_PROTECTION, now + 1_500)).toEqual(["short"]);
  });

  it("treats a never-read row as due — a page scrolled past is not a reader", () => {
    expect(collectEvictable(["untouched"], NO_PROTECTION)).toEqual(["untouched"]);
  });
});

describe("materials slice — eviction", () => {
  const state: MaterialsState = {
    a: material("a"),
    b: material("b"),
  };

  it("drops exactly the named rows", () => {
    const next = materialsReducer(state, materialsEvicted({ ids: ["a"] }));

    expect(Object.keys(next)).toEqual(["b"]);
    // Survivors keep their identity, so their subscribers do not re-render.
    expect(next.b).toBe(state.b);
  });

  it("returns the same state when it holds none of them", () => {
    expect(materialsReducer(state, materialsEvicted({ ids: ["zz"] }))).toBe(state);
    expect(materialsReducer(state, materialsEvicted({ ids: [] }))).toBe(state);
  });
});

describe("window slice — owner-scoped pins", () => {
  it("keeps a row pinned while any owner holds it", () => {
    let state = windowReducer(
      windowInitialState,
      materialsPinned({ ids: ["m1", "m2"], owner: "variation-1" }),
    );
    state = windowReducer(
      state,
      materialsPinned({ ids: ["m2"], owner: "variation-2" }),
    );

    expect(state.pinnedIds).toEqual(["m1", "m2"]);

    state = windowReducer(state, materialsUnpinned({ owner: "variation-1" }));

    // m1 was variation-1's alone; m2 is still held by variation-2.
    expect(state.pinnedIds).toEqual(["m2"]);
  });

  it("files an unowned pin under the ad-hoc owner", () => {
    const state = windowReducer(
      windowInitialState,
      materialsPinned({ ids: ["m1"] }),
    );

    expect(state.pins[ADHOC_PIN_OWNER]).toEqual(["m1"]);
    expect(state.pinnedIds).toEqual(["m1"]);
  });

  it("does not move the state when a pin repeats", () => {
    const first = windowReducer(
      windowInitialState,
      materialsPinned({ ids: ["m1"], owner: "variation-1" }),
    );
    const again = windowReducer(
      first,
      materialsPinned({ ids: ["m1"], owner: "variation-1" }),
    );

    expect(again).toBe(first);
  });

  it("drops a deleted row out of every owner's pins", () => {
    let state = windowReducer(
      windowInitialState,
      materialsPinned({ ids: ["m1", "m2"], owner: "variation-1" }),
    );
    state = windowReducer(state, materialDeleted({ id: "m1" }));

    expect(state.pinnedIds).toEqual(["m2"]);
    expect(state.pins["variation-1"]).toEqual(["m2"]);
  });

  it("ignores a release from an owner that holds nothing", () => {
    const state = windowReducer(
      windowInitialState,
      materialsUnpinned({ owner: "never-pinned" }),
    );

    expect(state).toBe(windowInitialState);
  });
});
