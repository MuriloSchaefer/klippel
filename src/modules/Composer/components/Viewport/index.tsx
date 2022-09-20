import React, { useEffect } from "react";
import styled from "styled-components";
// kernel imports
import Viewport, {
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

import { Material } from "../../interfaces/Material";
import { Composition } from "../../interfaces/Composition";
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

  const viewport = layoutManager.hooks.useActiveViewport();

  const graph = graphManager.hooks.useGraph<CompositionGraphState, string>(
    viewport.state.id,
    (g) => g.id
  );

  useEffect(() => {
    if (!graph.state) {
      dispatch(newGraph(viewport.state.id));
    }
  }, []);

  useEffect(() => {
    if (!graph.state) {
      console.log("creating graph");
      dispatch(newGraph(viewport.state.id));
    }
  }, [viewport.state.id]);

  const onMaterialSelected = (material: Material | Composition) => {
    console.log(material);
    dispatch(materialSelectedEvent({ material }));
  };

  return (
    <>
      <SettingsPanel>
        <ComposerLeftPanelContent />
      </SettingsPanel>
      <StyledViewport>
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
                onMaterialSelected={onMaterialSelected}
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
