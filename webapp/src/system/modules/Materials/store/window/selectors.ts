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
 * A row in the view whose data the mirror does not hold — evicted, or not
 * fetched yet. Carries only its id, and `placeholder` so the grid can tell.
 *
 * Built fresh per call rather than cached: the identity is meaningless (there
 * is nothing to compare) and a shared object would be handed to a DataGrid
 * that keys rows by identity.
 */
export const placeholderRow = (id: string): MaterialState =>
  ({
    id,
    placeholder: true,
    type: "",
    schemaVersion: "",
    suppliers: [],
    industry: "",
    externalId: "",
    attributes: {},
    stock: { amount: 0, unit: "" },
  }) as MaterialState;

export const isPlaceholder = (row: MaterialState | undefined): boolean =>
  Boolean((row as { placeholder?: boolean } | undefined)?.placeholder);

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
      // A view id with no row is the normal state of a windowed list, not an
      // error: the user paged past it and the residency sweep reclaimed it,
      // or a peer's delete landed between the page answer and this render.
      //
      // It becomes a **placeholder row** rather than disappearing. Dropping
      // it would shorten the list under the scrollbar and shuffle every row
      // below it, which is exactly the "glitch while scrolling" this module
      // is trying to be rid of. The grid renders a blank row of the right
      // height, and the viewport asks for the ones that are actually visible.
      out.push(material ?? placeholderRow(id));
    }
    return out;
  },
);
