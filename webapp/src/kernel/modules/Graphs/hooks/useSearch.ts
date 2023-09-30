import { useEffect } from "react";
import Edge from "../interfaces/Edge";
import Node from "../interfaces/Node";
import useSearchResult from "./useSearchResult";

const useSearch = <N = Node, E = Edge>(
  graphId: string,
  searchId: string,
  search: () => void
) => {
  useEffect(() => {
    search();
  }, []);

  const results = useSearchResult<N, E>(graphId, searchId);

  useEffect(() => {
    if (results?.outdated) search();

    return ()=> console.warn('left search results hanging') // TODO: add search result clean up logic
  }, [results?.outdated]);

  return results;
};

export default useSearch;
