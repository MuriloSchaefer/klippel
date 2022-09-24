import React, { useEffect } from "react";
import styled from "styled-components";
// kernel imports
import {
  Viewport,
  ViewportProps,
} from "@kernel/modules/LayoutModule/components/Viewport";
import SettingsPanel from "@kernel/modules/LayoutModule/components/Sidepanels/SettingsPanel";
import DetailsPanel from "@kernel/modules/LayoutModule/components/Sidepanels/DetailsPanel";
import { useAppDispatch } from "@kernel/store/hooks";
import { newGraph } from "@kernel/modules/GraphsModule/store/graphsManagerSlice";

// internal imports
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/LayoutModule";
import { IGraphModule } from "@kernel/modules/GraphsModule";

import { IMouseModule } from "@kernel/modules/MouseModule";
import { Composition } from "modules/Composer/interfaces/Composition";
import { Material } from "modules/Composer/interfaces/Material";
import FloatingShortcutsContainer from "@kernel/modules/MouseModule/components/Shortcuts";
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
  const layoutModule = useModule<ILayoutModule>("LayoutModule");
  const graphModule = useModule<IGraphModule>("GraphModule");
  const mouseModule = useModule<IMouseModule>("MouseModule");

  const viewport = layoutModule.hooks.useActiveViewport();
  const floatingShortcuts = mouseModule.hooks.useFloatingShortcuts(
    `${viewport.state.id}-shortcuts`
  );
  const floatingShortcutsManager =
    mouseModule.hooks.useFloatingShortcutsManager();

  const graph = graphModule.hooks.useGraph<CompositionGraphState, string>(
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
