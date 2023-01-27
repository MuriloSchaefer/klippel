import { createSelector } from "reselect"
import { LayoutState } from "../state"
import { RibbonMenuState } from "./state"

const selectRibbonMenuState = (state: {Layout: LayoutState}) => state && state.Layout?.ribbonMenu
export const selectTabs = createSelector(
    selectRibbonMenuState, 
    (state: RibbonMenuState | undefined) => state && state.tabs
)

export const selectActiveTab = createSelector(
    selectRibbonMenuState, 
    (state: RibbonMenuState | undefined) => state && state.activeTab
    )