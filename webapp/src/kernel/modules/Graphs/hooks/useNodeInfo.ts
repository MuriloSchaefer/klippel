import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "..";
import Edge from "../interfaces/Edge";
import Node from "../interfaces/Node";
import { EdgesHashMap, NodeConnections } from "../store/state";

interface NodeInfo<NT=Node, ET=Edge>{
    node: NT
    edges: EdgesHashMap<ET>
    adjacencyList: NodeConnections
}

const useNodeInfo = <NT=Node, ET=Edge>(graphId: string, nodeId: string): NodeInfo<NT, ET> => {
  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;

  const node = useGraph(graphId, (g) => g?.nodes[nodeId]);
  const adjacencyList = useGraph(graphId, (g) => g?.adjacencyList[nodeId]);
  const edges = useGraph(graphId, (g) =>
    Object.values(g?.edges ?? {})
      .filter(
        (e) =>
          adjacencyList.state?.inputs?.includes(e.id) ||
          adjacencyList.state?.outputs?.includes(e.id)
      )
      .reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})
  );

  return {
    node: node.state,
    edges: edges.state ?? {},
    adjacencyList: adjacencyList.state ?? {inputs: [], outputs: []},
  };
};

export default useNodeInfo;
