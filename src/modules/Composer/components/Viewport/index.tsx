import React, { useEffect } from "react";
import styled from "styled-components";
// kernel imports
import Viewport, { ViewportProps } from "@kernel/layout/components/Viewport";
import { useAppDispatch } from "@kernel/store/hooks";
import { newGraph } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import { useActiveViewport } from "@kernel/hooks/useViewport";

// internal imports
import useGraph from "@kernel/hooks/useGraph";
import { CompositionGraphState } from "modules/Composer/store/state";
import SettingsPanel from "@kernel/layout/components/Sidepanels/SettingsPanel";
import DetailsPanel from "@kernel/layout/components/Sidepanels/DetailsPanel";

import { Material } from "../../interfaces/Material";
import { Composition } from "../../interfaces/Composition";
import { materialSelectedEvent } from "../../store/actions";
import ComposerLeftPanelContent from "./LeftPanelContent";
import SVGManager from "../SVGManager";
import Proxies from "../SVGManager/proxies";
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
  const viewport = useActiveViewport();
  const graph = useGraph<CompositionGraphState, string>(
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
