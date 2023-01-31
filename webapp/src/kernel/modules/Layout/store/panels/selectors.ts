import { createSelector } from "reselect";
import { LayoutState } from "../state";

export const selectPanels = createSelector(
  (state: { Layout: LayoutState }) => state.Layout,
  (state: LayoutState | undefined) => state && state.panels
);

export const selectSettingsPanel = createSelector(
    (state: { Layout: LayoutState }) => state.Layout,
    (state: LayoutState | undefined) =>
      state && state.panels.settings
  )

  export const selectDetailsPanel = createSelector(
    (state: { Layout: LayoutState }) => state.Layout,
    (state: LayoutState | undefined) =>
      state && state.panels.details
  )