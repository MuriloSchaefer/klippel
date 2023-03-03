import Edge from "../interfaces/Edge"
import Node from "../interfaces/Node"
import { GraphSearch, GraphState, SearchResult } from "../store/state"


const dfs = (
    graph: Omit<GraphState, 'searchResults'>,
    nodeStart: string,
    validate: (node: Node, graph: GraphSearch, currFindings: Node[], visitedNodes: Node[]) => boolean,
    stopCriteria: (node: Node, graph: GraphSearch, currFindings: Node[], visitedNodes: Node[]) => boolean,
    depth?: number,
): SearchResult => {

    const visited = []
    const findings = []
    const queue = [nodeStart]

    return {
        findings: [],
        visited: []
    }
}

export default dfs