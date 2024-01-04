import Edge from "../interfaces/Edge"
import Node from "../interfaces/Node"
import { GraphState, SearchResult } from "../store/state"
import useGraph from "./useGraph"


const useSearchResult = <N extends Node=Node, E extends Edge=Edge>(graphId: string, resultPath: string) => {
    const result = useGraph<GraphState<N,E>, SearchResult>(graphId, g=> g?.searchResults && g.searchResults[resultPath])
    
    return result.state as SearchResult<N>
}

export default useSearchResult