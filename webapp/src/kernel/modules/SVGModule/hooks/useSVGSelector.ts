import { createSelector } from "reselect";
import { SVGModuleState, SVGState } from "../store/state";


const useSVGSelector = (path: string) => createSelector(
    (state: {SVGModule: SVGModuleState}) => state.SVGModule.svgs,
    (svgs): SVGState => svgs[path]
  )

export default useSVGSelector;