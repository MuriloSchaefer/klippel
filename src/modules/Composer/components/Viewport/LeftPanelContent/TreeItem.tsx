import React from "react";
import styled from "styled-components";

import { useAppDispatch } from "@kernel/store/hooks";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/GraphsModule";

import { CompositionGraphState, UIState } from "modules/Composer/store/state";
import { Composition } from "modules/Composer/interfaces/Composition";
import { Material } from "modules/Composer/interfaces/Material";
import { materialSelectedEvent } from "modules/Composer/store/actions";
import { useComposerUIState } from "modules/Composer/hooks/useComposerUIState";
import MaterialPreviewCircle from "../../Utils/MaterialPreviewCircle";

const StyledTreeItem = styled.div``;
const ItemDetails = styled.details`
  padding-left: 1rem;
  border-left: 1px dashed #aaa;
  &&[open] > summary {
    list-style-type: "🔽";
  }
  && > summary {
    list-style-type: "▶️";
  }
`;

const ItemLabel = styled.summary<{ isSelected: boolean }>`
  cursor: pointer;
  color: ${(p) => (p.isSelected ? "purple" : "white")};

  && > div {
    padding-left: 0.1rem;
    align-items: center;
    display: inline-flex;
    gap: 0.3em;
  }
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
  const graphModule = useModule<IGraphModule>("GraphModule");

  const { state: node } = graphModule.hooks.useGraph<
    CompositionGraphState,
    Composition | Material
  >(graphId, (g) => g.nodes[nodeId]);
  const selectedMaterial = useComposerUIState(
    (ui: UIState) => ui.rightPanel.selectedMaterialId
  );

  const handleSelection = (e: React.MouseEvent) => {
    if (node) dispatch(materialSelectedEvent({ id: node.id }));
    e.stopPropagation();
  };

  if (!node) return null;
  return (
    <StyledTreeItem
      key={nodeId}
      onClick={node.properties.Tipo?.value ? handleSelection : undefined}
    >
      {(node.properties.Nome?.value || showHiddenNodes) && (
        <ItemDetails>
          <ItemLabel isSelected={node.id === selectedMaterial}>
            <div>
              <span>{node.properties.Nome?.value ?? node.id}</span>
              {node.properties.Cor && (
                <MaterialPreviewCircle
                  color={node.properties.Cor.value}
                  r={5}
                />
              )}
            </div>
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
  );
};
TreeItem.defaultProps = {
  showHiddenNodes: false,
};

export const MemoizedTreeItem = React.memo(TreeItem);

export default MemoizedTreeItem;
