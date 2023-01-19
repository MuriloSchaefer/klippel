import { createSelector } from "reselect"
import { GraphState,GraphsManagerState } from "../state"

export type GraphSelector = <O = GraphState>(state: GraphState) => O
export const getGraphState = (graphId: string, selector?:GraphSelector) => {

    const defaultSelector = (state: GraphState) => state
    const usedSelector = selector ?? defaultSelector
    
    return createSelector(
        (state: {Graph: GraphsManagerState}) => state.Graph, 
        (state) => state && usedSelector(state.graphs[graphId])
        )
}
    