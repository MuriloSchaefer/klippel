import React, { useEffect } from "react";
import styled from "styled-components";
// kernel imports
import {
  Viewport,
  ViewportProps,
} from "@kernel/modules/LayoutManager/components/Viewport";
import SettingsPanel from "@kernel/modules/LayoutManager/components/Sidepanels/SettingsPanel";
import DetailsPanel from "@kernel/modules/LayoutManager/components/Sidepanels/DetailsPanel";
import { useAppDispatch } from "@kernel/store/hooks";
import { newGraph } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";

// internal imports
import useModule from "@kernel/hooks/useModule";
import { ILayoutManagerModule } from "@kernel/modules/LayoutManager";
import { IGraphModule } from "@kernel/modules/GraphsManager";

import { IMouseManagerModule } from "@kernel/modules/MouseManager";
import { Composition } from "modules/Composer/interfaces/Composition";
import { Material } from "modules/Composer/interfaces/Material";
import FloatingShortcutsContainer from "@kernel/modules/MouseManager/components/Shortcuts";
import { CompositionGraphState } from "../../store/state";
import { materialSelectedEvent } from "../../store/actions";
import Proxies from "../SVGManager/proxies";

import ComposerLeftPanelContent from "./LeftPanelContent";
import SVGManager from "../SVGManager";
import ComposerRightPanelContent from "./RightPanelContent";

const StyledViewport = styled.div`
  cursor: crosshair;
`;

interface ComposerViewportProps extends ViewportProps {
  mannequinSize?: string;
  product?: string;
  model?: string;
}

const ComposerViewport = ({
  mannequinSize = "p",
  product = "camiseta-fem",
  model = "modelo",
}: ComposerViewportProps) => {
  // Hooks
  const dispatch = useAppDispatch();
  const layoutManager = useModule<ILayoutManagerModule>("LayoutManager");
  const graphManager = useModule<IGraphModule>("GraphManager");
  const mouseManager = useModule<IMouseManagerModule>("MouseManager");

  const viewport = layoutManager.hooks.useActiveViewport();
  const floatingShortcuts = mouseManager.hooks.useFloatingShortcuts(
    `${viewport.state.id}-shortcuts`
  );
  const floatingShortcutsManager =
    mouseManager.hooks.useFloatingShortcutsManager();

  const graph = graphManager.hooks.useGraph<CompositionGraphState, string>(
    viewport.state.id,
    (g) => g.id
  );

  useEffect(() => {
    if (!graph.state) {
      dispatch(newGraph(viewport.state.id));
    }
    if (!floatingShortcuts.state) {
      floatingShortcutsManager.hooks.createShortcuts(
        `${viewport.state.id}-shortcuts`
      );
    }
  }, []);

  useEffect(() => {
    if (!graph.state) {
      dispatch(newGraph(viewport.state.id));
    }
  }, [viewport.state.id]);

  const onMaterialSelected = ({
    selectedMaterial,
  }: {
    selectedMaterial: Material | Composition;
    event: MouseEvent;
  }) => {
    dispatch(materialSelectedEvent({ id: selectedMaterial.id }));
  };

  return (
    <>
      <SettingsPanel>
        <ComposerLeftPanelContent />
      </SettingsPanel>
      <StyledViewport>
        <FloatingShortcutsContainer id={`${viewport.state.id}-shortcuts`}>
          <div style={{ width: "300px", height: "500px" }}>
            Viewport Shortcuts
          </div>
        </FloatingShortcutsContainer>
        <Viewport innerRef={null} id={viewport.state.id}>
          {graph.state ? (
            <SVGManager
              graphId={viewport.state.id}
              mannequinSize={mannequinSize}
              product={product}
              model={model}
            >
              <Proxies
                graphId={viewport.state.id}
                onClick={({ event }) => {
                  floatingShortcuts.hooks.showShortcuts(event);
                  event.stopPropagation();
                }}
                onDblClick={onMaterialSelected}
              />
            </SVGManager>
          ) : undefined}
        </Viewport>
      </StyledViewport>
      <DetailsPanel>
        <ComposerRightPanelContent />
      </DetailsPanel>
    </>
  );
};

ComposerViewport.defaultProps = {
  mannequinSize: "p",
  product: "camiseta-fem",
  model: "modelo",
};

export default ComposerViewport;
