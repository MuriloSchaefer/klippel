import React from "react";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/GraphsModule";

import {
  AdjacencyList,
  EdgesHashMap,
} from "@kernel/modules/GraphsModule/store/state";

import { CompositionGraphState } from "../../../store/state";
import { MemoizedTreeItem as TreeItem } from "./TreeItem";

export interface CompositionTreeProps {
  graphId: string;
  rootId?: string;
}

const CompositionTree = ({
  graphId,
  rootId = "root",
}: CompositionTreeProps): React.ReactElement => {
  const graphModule = useModule<IGraphModule>("GraphModule");

  const { state } = graphModule.hooks.useGraph<
    CompositionGraphState,
    { adjacencyList: AdjacencyList; edges: EdgesHashMap }
  >(graphId, (g) => ({ adjacencyList: g.adjacencyList, edges: g.edges }));

  const { adjacencyList, edges } = state || {};

  const buildTree = (id: string) => {
    const children: string[] =
      (adjacencyList && adjacencyList[id].outputs) ?? [];
    return (
      <TreeItem graphId={graphId} nodeId={id}>
        {children.map((c) => (edges ? buildTree(edges[c].targetId) : null))}
      </TreeItem>
    );
  };
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{adjacencyList && adjacencyList[rootId] && buildTree(rootId)}</>;
};

CompositionTree.defaultProps = {
  rootId: "root",
};

export default CompositionTree;
