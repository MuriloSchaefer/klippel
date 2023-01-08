import { createSelector } from "reselect";
import { LayoutState } from "./typings";


export const selectTheme = createSelector(
    (state: {Layout: LayoutState}) => state.Layout, 
    (state: LayoutState | undefined) => state && state.theme
    )