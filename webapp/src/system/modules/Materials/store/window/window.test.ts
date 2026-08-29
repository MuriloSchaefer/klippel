/**
 * Closing the stock view.
 *
 * The view describes a grid; when the grid goes away the view has to go with
 * it, or reopening restores a scroll position into rows the forced sweep has
 * just reclaimed.
 */
import slice from "./slice";
import { initialState } from "./state";
import { closeMaterialsView, materialsPinned } from "../materials/actions";

const reducer = slice.reducer;

describe("window slice — closeMaterialsView", () => {
  const open = () => {
    const pinned = reducer(
      initialState,
      materialsPinned({ ids: ["m1"], owner: "variation-1" }),
    );
    return {
      ...pinned,
      resultIds: ["a", "b", "c"],
      nextOffset: 300,
      hasMore: true,
      loading: true,
      initialized: true,
      total: 437,
      matched: 437,
      query: "azul",
    };
  };

  it("clears the page and the cursor", () => {
    const next = reducer(open(), closeMaterialsView());

    expect(next.resultIds).toEqual([]);
    expect(next.nextOffset).toBe(0);
    expect(next.hasMore).toBe(false);
    expect(next.loading).toBe(false);
    // Reopening must fetch a fresh first page rather than trusting a view
    // whose rows have just been reclaimed.
    expect(next.initialized).toBe(false);
  });

  it("keeps what does not belong to the view", () => {
    const next = reducer(open(), closeMaterialsView());

    // Pins belong to other tabs; `total` is a fact about the catalog.
    expect(next.pinnedIds).toEqual(["m1"]);
    expect(next.pins["variation-1"]).toEqual(["m1"]);
    expect(next.total).toBe(437);
  });
});
