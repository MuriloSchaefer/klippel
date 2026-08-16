/**
 * Residency as store state: what the reducer records, and what the selector
 * decides may be dropped.
 *
 * These are the rules that keep the renderer's memory bounded while browsing
 * a large catalog, so they are asserted directly rather than inferred from a
 * rendered grid.
 */
import slice from "./slice";
import {
  configureMaterialsResidency,
  releaseMaterials,
  resetMaterialsResidency,
  retainMaterials,
  touchMaterials,
} from "./actions";
import { selectEvictableIds } from "./selectors";
import { DEFAULT_RESIDENCY_CONFIG, initialState } from "./state";
import { materialDeleted, materialsEvicted } from "../materials/actions";
import { initialState as windowInitialState } from "../window/state";
import type { MaterialState } from "../materials/state";
import type { ResidencyState } from "./state";

const reducer = slice.reducer;

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

/** A root state holding `resident` materials, `pinned` ids, and `residency`. */
const rootState = (
  resident: string[],
  residency: ResidencyState,
  pinned: string[] = [],
) => ({
  Materials: {
    materials: Object.fromEntries(resident.map((id) => [id, material(id)])),
    window: { ...windowInitialState, pinnedIds: pinned },
    residency,
  },
}) as never;

/** Apply a sequence of actions to the residency slice. */
const applied = (...actions: { type: string; payload?: unknown }[]) =>
  actions.reduce<ResidencyState>(
    (state, action) => reducer(state, action as never),
    initialState,
  );

describe("residency reducer", () => {
  it("counts each retain and forgets a row at zero", () => {
    let state = applied(retainMaterials(["a"]), retainMaterials(["a"]));
    expect(state.refCounts.a).toBe(2);

    state = reducer(state, releaseMaterials(["a"]));
    expect(state.refCounts.a).toBe(1);

    state = reducer(state, releaseMaterials(["a"]));
    expect(state.refCounts.a).toBeUndefined();
    // The TTL starts when the last reader lets go.
    expect(state.lastAccess.a).toBeDefined();
  });

  it("does not move the state when a touch changes nothing", () => {
    const first = applied(touchMaterials(["a"]));
    const at = first.lastAccess.a;

    expect(reducer(first, { type: touchMaterials.type, payload: { ids: ["a"], at } } as never)).toBe(
      first,
    );
    expect(reducer(first, touchMaterials([]))).toBe(first);
  });

  it("forgets evicted and deleted rows", () => {
    const state = applied(retainMaterials(["a", "b"]), touchMaterials(["a", "b"]));

    const afterEvict = reducer(state, materialsEvicted({ ids: ["a"] }));
    expect(afterEvict.refCounts.a).toBeUndefined();
    expect(afterEvict.lastAccess.a).toBeUndefined();
    expect(afterEvict.refCounts.b).toBe(1);

    const afterDelete = reducer(afterEvict, materialDeleted({ id: "b" }));
    expect(afterDelete.lastAccess.b).toBeUndefined();
  });

  it("keeps ref counts across a reset, drops the history", () => {
    const state = applied(retainMaterials(["a"]), touchMaterials(["b"]));
    const next = reducer(state, resetMaterialsResidency());

    // Mounted consumers did not unmount because the workspace changed.
    expect(next.refCounts.a).toBe(1);
    expect(next.lastAccess).toEqual({});
  });

  it("clamps the config and ignores a no-op change", () => {
    const state = reducer(initialState, configureMaterialsResidency({ ttlMs: 1 }));
    expect(state.config.ttlMs).toBe(1_000);

    expect(reducer(state, configureMaterialsResidency({ ttlMs: 1 }))).toBe(state);
  });
});

describe("selectEvictableIds", () => {
  it("keeps a pinned row however old", () => {
    const state = rootState(["pinned"], applied(touchMaterials(["pinned"])), [
      "pinned",
    ]);

    expect(
      selectEvictableIds(state, Date.now() + DEFAULT_RESIDENCY_CONFIG.ttlMs * 10),
    ).toEqual([]);
  });

  it("keeps a row something is rendering, however old the last read", () => {
    const state = rootState(["rendered"], applied(retainMaterials(["rendered"])));

    expect(
      selectEvictableIds(state, Date.now() + DEFAULT_RESIDENCY_CONFIG.ttlMs * 10),
    ).toEqual([]);
  });

  it("releases a row once its last reader lets go and the TTL passes", () => {
    const held = applied(
      retainMaterials(["a"]),
      retainMaterials(["a"]),
      releaseMaterials(["a"]),
    );
    const at = Date.now() + DEFAULT_RESIDENCY_CONFIG.ttlMs * 10;

    // Still held by the second consumer.
    expect(selectEvictableIds(rootState(["a"], held), at)).toEqual([]);

    const freed = reducer(held, releaseMaterials(["a"]));
    expect(selectEvictableIds(rootState(["a"], freed), at)).toEqual(["a"]);
  });

  it("keeps a row read within the TTL and drops it after", () => {
    const now = Date.now();
    const state = applied(touchMaterials(["recent"]));
    const readAt = state.lastAccess.recent;

    expect(
      selectEvictableIds(
        rootState(["recent"], state),
        readAt + DEFAULT_RESIDENCY_CONFIG.ttlMs - 1,
      ),
    ).toEqual([]);
    expect(
      selectEvictableIds(
        rootState(["recent"], state),
        readAt + DEFAULT_RESIDENCY_CONFIG.ttlMs + 1,
      ),
    ).toEqual(["recent"]);
    expect(now).toBeLessThanOrEqual(readAt);
  });

  it("honours a reconfigured TTL", () => {
    const state = applied(
      configureMaterialsResidency({ ttlMs: 1_000 }),
      touchMaterials(["short"]),
    );

    expect(
      selectEvictableIds(rootState(["short"], state), state.lastAccess.short + 1_500),
    ).toEqual(["short"]);
  });

  it("treats a never-read row as due — a page scrolled past is not a reader", () => {
    expect(selectEvictableIds(rootState(["untouched"], initialState))).toEqual([
      "untouched",
    ]);
  });
});
