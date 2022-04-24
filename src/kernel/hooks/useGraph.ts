import { useAppSelector } from "@kernel/store/hooks";

import GraphState from "@kernel/modules/Graph/store/state";
// eslint-disable-next-line import/no-cycle
import { selectGraph } from "@kernel/modules/Graph/store/graphSlice";

const useGraph = () => {
  const { nodes, edges, adjacencyList }: GraphState =
    useAppSelector(selectGraph);

  return { nodes, edges, adjacencyList };
};

export default useGraph;
