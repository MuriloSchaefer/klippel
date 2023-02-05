import { createSelector } from "reselect";
import { LayoutState } from "../state";
import { ViewportState } from "./state";

export const selectActiveViewport = createSelector(
  (state: { Layout: LayoutState }) => state.Layout.viewportManager,
  (state): string | undefined => state && state.activeViewport
);

const getViewportManagerState = (state: { Layout: LayoutState }) =>
  state.Layout.viewportManager;
export const selectViewportStates = createSelector(
  getViewportManagerState,
  (state) => state && state.viewports
);

export type ViewportStateSelector = <O = ViewportState>(
  state: ViewportState
) => O;
export const getViewportState = (
  name: string,
  selector?: ViewportStateSelector
) => {
  const defaultSelector = (state: ViewportState) => state;
  const usedSelector = selector ?? defaultSelector;

  return createSelector(
    getViewportManagerState,
    (state) => state && usedSelector(state.viewports[name])
  );
};
