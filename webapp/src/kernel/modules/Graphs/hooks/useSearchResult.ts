import useGraph from "./useGraph"


const useSearchResult = (graphId: string, resultPath: string) => {
    const result = useGraph(graphId, g=>g?.searchResults[resultPath])
    
    return result.state
}

export default useSearchResult