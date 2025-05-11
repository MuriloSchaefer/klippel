import { GraphState } from "@kernel/modules/Graphs/store/state"

export type Model = {
    id: string,
    name: string,
    svg?: string,
    graph: GraphState,
    description: string
}