import { useAppSelector } from "@kernel/store/hooks";

import { GraphState } from "../store/state";
// eslint-disable-next-line import/no-cycle
import { selectGraph } from "../store/graphsManagerSlice";

const useGraph = (graphId: string) => {
  const graphState: GraphState | null = useAppSelector((state) =>
    selectGraph(state, graphId)
  );
  if (!graphState) throw Error("Graph does not exist");

  return graphState;
};

export default useGraph;
