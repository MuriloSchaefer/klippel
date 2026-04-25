import { createSelector } from "reselect";
import { LayoutState } from "../state";

const selectLayout = (state: { Layout: LayoutState }) => state.Layout;

export const selectPanels = createSelector(
  selectLayout,
  (layoutState: LayoutState | undefined) => layoutState?.panels
);

export const selectSettingsPanel = createSelector(
  selectPanels,
  (panels) => panels?.settings
);

export const selectDetailsPanel = createSelector(
  selectPanels,
  (panels) => panels?.details
);