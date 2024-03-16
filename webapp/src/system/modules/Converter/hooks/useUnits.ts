import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { CompoundNode, ConversionGraph, UnitNode } from "../typings";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { NodesHashMap } from "@kernel/modules/Graphs/store/state";

export default (nodeIds: string[]) => {
  const graphModule = useModule<IGraphModule>("Graph");

  const { useGraph } = graphModule.hooks;
  const nodes = useGraph<
    ConversionGraph,
    NodesHashMap<UnitNode | CompoundNode>
  >(
    CONVERSION_GRAPH_NAME,
    (g) =>
      g &&
      Object.values(g.nodes)
        .filter((n): n is UnitNode | CompoundNode => nodeIds.includes(n.id))
        .reduce((acc, curr) => ({...acc, [curr.id]: curr}), {})
  );

  return nodes.state;
};
