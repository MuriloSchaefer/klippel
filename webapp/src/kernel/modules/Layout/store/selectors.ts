import { createSelector } from "reselect";
import { LayoutState } from "./state";


export const selectTheme = createSelector(
    (state: {Layout: LayoutState}) => state.Layout, 
    (state: LayoutState | undefined) => state && state.theme
    )

export const selectTabs = createSelector(
    (state: {Layout: LayoutState}) => state.Layout, 
    (state: LayoutState | undefined) => state && state.tabs
)

export const selectActiveTab = createSelector(
    (state: {Layout: LayoutState}) => state.Layout, 
    (state: LayoutState | undefined) => state && state.activeTab
    )