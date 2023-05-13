import { createSelector } from "reselect";
import { LayoutState } from "../../state";

export const selectAllGroups = createSelector(
  (state: { Layout: LayoutState }) => state.Layout.viewportManager,
  (state) => state && state.groups
);