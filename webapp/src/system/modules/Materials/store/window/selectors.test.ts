/**
 * The view is a list of *positions*; the mirror holds a subset of their data.
 *
 * Once rows can be reclaimed while their id is still in the view, this
 * selector is what stops that from being visible as the list shrinking under
 * the scrollbar — which is the failure mode the whole windowing effort is
 * trying to avoid.
 */
import { isPlaceholder, selectWindowedMaterials } from "./selectors";
import { initialState as windowInitialState } from "./state";
import type { MaterialState } from "../materials/state";

const material = (id: string): MaterialState => ({
  id,
  type: "tecido",
  schemaVersion: "tecido@1",
  suppliers: [],
  industry: "ind",
  externalId: id,
  attributes: { nome: id },
  stock: { amount: 1, unit: "m" },
});

const stateWith = (resultIds: string[], resident: string[]) => ({
  Materials: {
    window: { ...windowInitialState, resultIds },
    materials: Object.fromEntries(resident.map((id) => [id, material(id)])),
  },
});

describe("selectWindowedMaterials", () => {
  it("keeps the view's length when rows are missing", () => {
    const rows = selectWindowedMaterials(
      stateWith(["a", "b", "c"], ["a", "c"]) as never,
    );

    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(rows.map(isPlaceholder)).toEqual([false, true, false]);
  });

  it("marks a missing row as a placeholder and carries no data on it", () => {
    const [row] = selectWindowedMaterials(stateWith(["gone"], []) as never);

    expect(isPlaceholder(row)).toBe(true);
    expect(row.id).toBe("gone");
    // Filler, never displayed — the grid renders empty cells for it.
    expect(row.attributes).toEqual({});
    expect(row.stock.amount).toBe(0);
  });

  it("never marks a resident row", () => {
    const [row] = selectWindowedMaterials(stateWith(["a"], ["a"]) as never);

    expect(isPlaceholder(row)).toBe(false);
    expect(row.attributes.nome).toBe("a");
  });
});
