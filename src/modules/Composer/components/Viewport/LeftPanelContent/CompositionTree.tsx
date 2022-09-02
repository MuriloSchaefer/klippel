import {
  AdjacencyList as AL,
  NodeConnections,
} from "@kernel/modules/GraphsManager/store/state";
import { NodeId } from "@kernel/modules/GraphsManager/interfaces/Node";

import useGraph from "@kernel/hooks/useGraph";
import React from "react";
import styled from "styled-components";
import { CompositionGraphState } from "modules/Composer/store/state";
import { EdgeId } from "@kernel/modules/GraphsManager/interfaces/Edge";

export interface CompositionTreeProps {
  graphId: string;
  rootId?: string;
}

const Tree = styled.ul`
  list-style: none;
  padding-left: 1rem;
`;

const TreeItem = styled.li``;
const ItemDetails = styled.details`
  /* details[open] > summary {
    list-style-type: none;
  } */
`;
const ItemLabel = styled.summary`
  cursor: pointer;
`;

const CompositionTree = ({
  graphId,
  rootId = "root",
}: CompositionTreeProps): React.ReactElement => {
  const { state: adjacencyList } = useGraph<CompositionGraphState, AL>(
    graphId,
    (g) => g.adjacencyList
  );
  const filterChildren = (nodeId: NodeId) =>
    adjacencyList &&
    Object.entries(adjacencyList).filter(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_id, c]: [NodeId, NodeConnections]) => c.inputs.includes(nodeId)
    );

  if (!adjacencyList) return <Tree />;

  const buildTree = (nodeId: NodeId): React.ReactElement => {
    if (!(nodeId in adjacencyList)) return <Tree />;
    const connection = adjacencyList[nodeId];
    const hasSubtree = connection.outputs.length > 0;

    return (
      <Tree key={nodeId}>
        <TreeItem>
          <ItemDetails>
            <ItemLabel>{nodeId}</ItemLabel>
            {hasSubtree && (
              <TreeItem key={nodeId}>
                {connection.outputs.map((edgeId: EdgeId) => {
                  const children = filterChildren(edgeId) ?? [];

                  return children.map(([id]) => buildTree(id));
                })}
              </TreeItem>
            )}
          </ItemDetails>
        </TreeItem>
      </Tree>
    );
  };

  return buildTree(rootId);
};

CompositionTree.defaultProps = {
  rootId: "root",
};

export default CompositionTree;
