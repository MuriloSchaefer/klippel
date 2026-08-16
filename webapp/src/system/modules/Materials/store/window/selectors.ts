import { createSelector } from "reselect";

import type { MaterialsModuleState } from "../state";
import type { MaterialState, MaterialsState } from "../materials/state";
import { initialState, MaterialsWindowState } from "./state";

const selectModule = (state: { Materials: MaterialsModuleState }) =>
  state.Materials;

/** Counts, paging cursor and the current view's id order. */
export const selectMaterialsWindow = createSelector(
  selectModule,
  (module: MaterialsModuleState | undefined): MaterialsWindowState =>
    module?.window ?? initialState,
);

/**
 * The rows the stock grid renders, in the order the server ranked them.
 *
 * Reading through `resultIds` rather than `Object.values(materials)` is what
 * keeps the grid showing a *page* — the slice also holds rows pinned by open
 * models and rows resolved by id, which belong to no page and must not
 * silently appear in the stock list.
 */
export const selectWindowedMaterials = createSelector(
  [
    selectMaterialsWindow,
    (state: { Materials: MaterialsModuleState }) => state.Materials?.materials,
  ],
  (
    window: MaterialsWindowState,
    materials: MaterialsState | undefined,
  ): MaterialState[] => {
    if (!materials) return [];
    const out: MaterialState[] = [];
    for (const id of window.resultIds) {
      const material = materials[id];
      // A result id with no row is not an error: a peer's delete can land
      // between the page answer and this render.
      if (material) out.push(material);
    }
    return out;
  },
);
