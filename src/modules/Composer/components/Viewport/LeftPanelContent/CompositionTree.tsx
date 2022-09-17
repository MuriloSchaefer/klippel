import useGraph from "@kernel/hooks/useGraph";
import {
  AdjacencyList,
  EdgesHashMap,
} from "@kernel/modules/GraphsManager/store/state";
import { CompositionGraphState } from "modules/Composer/store/state";
import React from "react";
import { MemoizedTreeItem as TreeItem } from "./TreeItem";

export interface CompositionTreeProps {
  graphId: string;
  rootId?: string;
}

const CompositionTree = ({
  graphId,
  rootId = "root",
}: CompositionTreeProps): React.ReactElement => {
  const { state: adjacencyList } = useGraph<
    CompositionGraphState,
    AdjacencyList
  >(graphId, (g) => g.adjacencyList);

  const { state: edges } = useGraph<CompositionGraphState, EdgesHashMap>(
    graphId,
    (g) => g.edges
  );

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
