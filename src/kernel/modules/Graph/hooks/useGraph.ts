import { useAppSelector } from "@kernel/store/hooks";

import GraphState from "../store/state";
// eslint-disable-next-line import/no-cycle
import { selectGraph } from "../store/graphSlice";

const useGraph = () => {
  const { nodes, edges, adjacencyList }: GraphState =
    useAppSelector(selectGraph);

  return { nodes, edges, adjacencyList };
};

export default useGraph;
