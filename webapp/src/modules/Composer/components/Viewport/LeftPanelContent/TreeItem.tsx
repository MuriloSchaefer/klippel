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
import { ILayoutModule } from "@kernel/modules/LayoutModule";

const ItemDetails = styled.details`
  padding-left: 1rem;
  border-left: 1px dashed #aaa;
  margin-bottom: 0.1rem;
  &&[open] > summary {
    list-style-type: "🔽";
  }
  && > summary {
    list-style-type: "▶️";
  }
`;

const ItemLabel = styled.summary<{ $isselected: boolean }>`
  cursor: pointer;
  color: ${(p) => (p.$isselected ? "purple" : "white")};
  margin-bottom: 0.1rem;

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
  showHiddenNodes?: boolean;
}

const TreeItem = ({
  graphId,
  nodeId,
  showHiddenNodes,
}: TreeItemProps) => {
  const dispatch = useAppDispatch();
  const layoutModule = useModule<ILayoutModule>("LayoutModule");
  const graphModule = useModule<IGraphModule>("GraphModule");

  const { useActiveViewport } = layoutModule.hooks.module;
  const viewport = useActiveViewport();
  const selectedMaterial = useComposerUIState((ui) => ui.viewports[viewport.state.id].UI.detailsPanel.selectedMaterialId);

  const { state: node } = graphModule.hooks.module.useGraph<
    CompositionGraphState,
    Composition | Material
  >(graphId, (g) => g && g.nodes[nodeId]);

  const handleSelection = (e: React.MouseEvent) => {
    if (node) dispatch(materialSelectedEvent({ id: node.id, viewportId: viewport.state.id }));
    e.stopPropagation();
  };

  if (!node || !(node.properties.Nome?.value || showHiddenNodes)) return null;
  return (
    <ItemDetails
      onClick={node.properties.Tipo?.value ? handleSelection : undefined} role="item-details"
    >
      <ItemLabel $isselected={node.id === selectedMaterial} role="item-summary">
        <div>
          <span role="item-label">{node.properties.Nome?.value ?? node.id}</span>
          {node.properties.Cor && (
            <MaterialPreviewCircle color={node.properties.Cor.value} r={5} />
          )}
        </div>
      </ItemLabel>
      <div role="subtree">
            {Object.values(node.outputs).map(out => (<TreeItem key={`${graphId}-${out.targetId}`} graphId={graphId} nodeId={out.targetId} />))}
      </div>
    </ItemDetails>
  );
};
TreeItem.defaultProps = {
  showHiddenNodes: false,
};

export const MemoizedTreeItem = React.memo(TreeItem);

export default MemoizedTreeItem;
