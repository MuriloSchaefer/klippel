import { createSelector } from "reselect";
import {  SVGModuleState } from "./state";

const selectSVGModule = (state: {SVG: SVGModuleState}) => state.SVG

export const selectSVGState = (path: string) => createSelector(
    selectSVGModule,
    (state: SVGModuleState | undefined) => state && state.svgs[path]
    )
    
