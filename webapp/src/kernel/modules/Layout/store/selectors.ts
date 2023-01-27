import { createSelector } from "reselect";
import { LayoutState } from "./state";

export const selectTheme = createSelector(
    (state: {Layout: LayoutState}) => state.Layout, 
    (state: LayoutState | undefined) => state && state.theme
    )
    
