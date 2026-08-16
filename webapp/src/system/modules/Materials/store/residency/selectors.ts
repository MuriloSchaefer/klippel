import { createSelector } from "reselect";

import type { MaterialsModuleState } from "../state";
import { selectMaterialsWindow } from "../window/selectors";
import { initialState, type ResidencyState } from "./state";

type RootState = { Materials: MaterialsModuleState };

const selectModule = (state: RootState) => state.Materials;

export const selectResidency = createSelector(
  selectModule,
  (module: MaterialsModuleState | undefined): ResidencyState =>
    module?.residency ?? initialState,
);

export const selectResidencyConfig = createSelector(
  selectResidency,
  (residency) => residency.config,
);

/** Is anything currently rendering this material? */
export const selectIsRetained = (id: string) =>
  createSelector(selectResidency, (residency) => (residency.refCounts[id] ?? 0) > 0);

/**
 * What the mirror must keep regardless of when it was last read: the rows
 * open tabs reference.
 *
 * **Not the whole view.** `resultIds` grows with every page the user scrolls
 * through, so protecting all of it would end up protecting the catalog — the
 * state the sweep exists to prevent. What is on screen is a much smaller
 * thing, and the grid says so by retaining the rows it renders.
 */
export const selectProtectedIds = createSelector(
  selectMaterialsWindow,
  (window) => new Set(window.pinnedIds),
);

/**
 * Which resident ids may be dropped: nobody is rendering them, nothing
 * protects them, and their grace period has run out.
 *
 * A plain function rather than a memoized selector — it is called once per
 * sweep with a `now` that changes every time, so a memo would only ever miss.
 */
export function selectEvictableIds(
  state: RootState,
  at: number = Date.now(),
): string[] {
  const materials = state.Materials?.materials;
  if (!materials) return [];
  const { refCounts, lastAccess, config } = selectResidency(state);
  const protectedIds = selectProtectedIds(state);

  const out: string[] = [];
  for (const id of Object.keys(materials)) {
    if (protectedIds.has(id)) continue;
    if ((refCounts[id] ?? 0) > 0) continue;
    const seen = lastAccess[id];
    // Never seen means never read by any UI — it arrived in a page and was
    // scrolled past. Treat it as due, or a mirror filled by scrolling would
    // never shrink.
    if (seen !== undefined && at - seen < config.ttlMs) continue;
    out.push(id);
  }
  return out;
}
