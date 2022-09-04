import React from "react";
import useGraph from "@kernel/hooks/useGraph";
import styled from "styled-components";

import { CompositionGraphState, UIState } from "modules/Composer/store/state";
import { Composition } from "modules/Composer/interfaces/Composition";
import { Part } from "modules/Composer/interfaces/Part";
import { useAppDispatch } from "@kernel/store/hooks";
import { partSelectedEvent } from "modules/Composer/store/actions";
import { useComposerUIState } from "modules/Composer/hooks/useComposerUIState";

const StyledTreeItem = styled.li``;
const ItemDetails = styled.details`
  /* details[open] > summary {
    list-style-type: none;
  } */
`;
const Tree = styled.ul`
  list-style: none;
  padding-left: 1rem;
`;

const ItemLabel = styled.summary<{ isSelected: boolean }>`
  cursor: pointer;
  color: ${(p) => (p.isSelected ? "purple" : "white")};
`;

interface TreeItemProps {
  graphId: string;
  nodeId: string;
}

export const TreeItem = ({ graphId, nodeId }: TreeItemProps) => {
  const dispatch = useAppDispatch();
  const { state: node } = useGraph<CompositionGraphState, Composition | Part>(
    graphId,
    (g) => g.nodes[nodeId]
  );
  const selectedMaterial = useComposerUIState(
    (ui: UIState) => ui.rightPanel.selectedPartId
  );
  const children: string[] = Object.keys(node?.outputs ?? []);

  const handleSelection = (e: React.MouseEvent) => {
    console.log(node);

    e.stopPropagation();
    return node && dispatch(partSelectedEvent({ part: node }));
  };

  if (!node) return null;
  return (
    <Tree key={`${graphId}-${nodeId}`}>
      <StyledTreeItem key={nodeId} onClick={handleSelection}>
        <ItemDetails>
          <ItemLabel isSelected={node.id === selectedMaterial}>
            {node.id}
          </ItemLabel>
          {children.map((childId) => (
            <TreeItem graphId={graphId} nodeId={childId} />
          ))}
          {/* {hasSubtree && (
          <StyledTreeItem key={nodeId}>
            {connection.outputs.map((edgeId: EdgeId) => {
              const children = filterChildren(edgeId) ?? [];

              return children.map(([id]) => buildTree(id));
            })}
          </TreeItem>
        )} */}
        </ItemDetails>
      </StyledTreeItem>
    </Tree>
  );
};

export default TreeItem;
