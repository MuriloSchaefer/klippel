import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/GraphsManager";
import { useAppSelector } from "@kernel/store/hooks";
import React from "react";
import styled from "styled-components";

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
  const graphManager = useModule<IGraphModule>("GraphsManager");
  const { selectGraphById } = graphManager.store.selectors;

  const { adjacencyList, edges } = useAppSelector((state) =>
    selectGraphById(state, graphId)
  );

  const buildTree = (nodeId: string): React.ReactElement => {
    const isComposition = adjacencyList[nodeId].outputs.length > 0;
    return (
      <Tree key={nodeId}>
        <TreeItem>
          <ItemDetails>
            <ItemLabel>{nodeId}</ItemLabel>
            {isComposition && (
              <TreeItem key={nodeId}>
                {adjacencyList[nodeId].outputs.map((edgeId: string) => {
                  const childId = edges[edgeId].targetId;
                  return buildTree(childId);
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
