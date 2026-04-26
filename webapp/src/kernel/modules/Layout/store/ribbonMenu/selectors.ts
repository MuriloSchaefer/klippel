import { createSelector } from "reselect"
import { LayoutState } from "../state"
import { RibbonMenuState } from "./state"

const selectRibbonMenuState = (state: {Layout: LayoutState}) => state?.Layout?.ribbonMenu

export const selectTabs = createSelector(
    selectRibbonMenuState, 
    (state: RibbonMenuState | undefined) => state?.tabs
)

export const selectActiveTab = createSelector(
    selectRibbonMenuState, 
    (state: RibbonMenuState | undefined) => state?.activeTab
)