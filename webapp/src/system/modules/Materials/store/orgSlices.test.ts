/**
 * Industries / sellers under windowed reads.
 *
 * These two slices are populated as a side effect of catalog reads, which
 * makes them easy to get wrong in one specific way: treating every page as
 * authoritative. A page is authoritative about *materials*, never about the
 * absence of an organization — so only a `reset` read may replace.
 */
import industriesSlice from "./industries/slice";
import sellersSlice from "./sellers/slice";
import { materialsWindowLoaded } from "./materials/actions";
import type { CatalogWindow } from "../typings/catalog";

const org = (id: string, type: "industry" | "seller") => ({
  id,
  type,
  name: id,
  updatedAt: 1,
});

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

describe.each([
  {
    label: "industries",
    reducer: industriesSlice.reducer,
    key: "industries" as const,
    kind: "industry" as const,
  },
  {
    label: "sellers",
    reducer: sellersSlice.reducer,
    key: "sellers" as const,
    kind: "seller" as const,
  },
])("$label — materialsWindowLoaded", ({ reducer, key, kind }) => {
  const existing = { a: org("a", kind) } as never;

  it("merges what a page carries", () => {
    const next = reducer(
      existing,
      materialsWindowLoaded(windowPayload({ [key]: { b: org("b", kind) } })),
    );

    expect(Object.keys(next).sort()).toEqual(["a", "b"]);
  });

  it("does not empty the slice when a page carries none", () => {
    // The failure this guards: a page read while the catalog's org record had
    // not resolved came back with `{}` and wiped every industry / supplier
    // label in the UI. Absence in a page means "not sent".
    const next = reducer(existing, materialsWindowLoaded(windowPayload()));

    expect(next).toBe(existing);
  });

  it("replaces on a reset read — the previous workspace's entries must go", () => {
    const next = reducer(
      existing,
      materialsWindowLoaded(
        windowPayload({ reset: true, [key]: { z: org("z", kind) } }),
      ),
    );

    expect(Object.keys(next)).toEqual(["z"]);
  });
});
