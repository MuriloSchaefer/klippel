import React from "react";
import styled from "styled-components";

import { useAppDispatch } from "@kernel/store/hooks";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/GraphsManager";

import { CompositionGraphState, UIState } from "modules/Composer/store/state";
import { Composition } from "modules/Composer/interfaces/Composition";
import { Material } from "modules/Composer/interfaces/Material";
import { materialSelectedEvent } from "modules/Composer/store/actions";
import { useComposerUIState } from "modules/Composer/hooks/useComposerUIState";
import MaterialPreviewCircle from "../../Utils/MaterialPreviewCircle";

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
  display: flex;
  align-items: center;
  gap: 0.3em;
`;

interface TreeItemProps {
  graphId: string;
  nodeId: string;
  children: React.ReactNode;
  showHiddenNodes?: boolean;
}

const TreeItem = ({
  graphId,
  nodeId,
  children,
  showHiddenNodes,
}: TreeItemProps) => {
  const dispatch = useAppDispatch();
  const graphManager = useModule<IGraphModule>("GraphManager");

  const { state: node } = graphManager.hooks.useGraph<
    CompositionGraphState,
    Composition | Material
  >(graphId, (g) => g.nodes[nodeId]);
  const selectedMaterial = useComposerUIState(
    (ui: UIState) => ui.rightPanel.selectedMaterialId
  );

  const handleSelection = (e: React.MouseEvent) => {
    if (node) dispatch(materialSelectedEvent({ material: node }));
    e.stopPropagation();
  };

  if (!node) return null;
  return (
    <Tree key={`${graphId}-${nodeId}`}>
      <StyledTreeItem
        key={nodeId}
        onDoubleClick={
          node.properties.Tipo?.value ? handleSelection : undefined
        }
      >
        {(node.properties.Nome?.value || showHiddenNodes) && (
          <ItemDetails>
            <ItemLabel isSelected={node.id === selectedMaterial}>
              <span>{node.properties.Nome?.value ?? node.id}</span>
              {node.properties.Cor && (
                <MaterialPreviewCircle
                  color={node.properties.Cor.value}
                  r={5}
                />
              )}
            </ItemLabel>
            {children}
            {/* {hasSubtree && (
          <StyledTreeItem key={nodeId}>
            {connection.outputs.map((edgeId: EdgeId) => {
              const children = filterChildren(edgeId) ?? [];

              return children.map(([id]) => buildTree(id));
            })}
          </TreeItem>
        )} */}
          </ItemDetails>
        )}
      </StyledTreeItem>
    </Tree>
  );
};
TreeItem.defaultProps = {
  showHiddenNodes: false,
};

export const MemoizedTreeItem = React.memo(TreeItem);

export default MemoizedTreeItem;
