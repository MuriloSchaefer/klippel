import { createSelector } from "reselect";
import { LayoutState } from "../state";
import { ViewportState } from "./state";

const getViewportManagerState = (state: { Layout: LayoutState }) =>
  state.Layout.viewportManager;

export const selectActiveViewport = createSelector(
  getViewportManagerState,
  (state): string | undefined => state?.activeViewport
);

export const getViewportGroups = createSelector(
  getViewportManagerState,
  (state) => state?.groups
);

export const selectViewportStates = createSelector(
  getViewportManagerState,
  (state) => state?.viewports
);

export const selectDirtyViewports = createSelector(
  getViewportManagerState,
  (state): { [name: string]: boolean } => state?.dirtyViewports ?? {}
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
    (state) => state?.viewports?.[name] ? usedSelector(state.viewports[name]) : undefined
  );
};
