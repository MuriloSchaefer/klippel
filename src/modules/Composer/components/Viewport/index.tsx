import React, { useEffect } from "react";

// kernel imports
import Viewport, { ViewportProps } from "@kernel/layout/components/Viewport";
import { useAppDispatch } from "@kernel/store/hooks";
import { newGraph } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import { useActiveViewport } from "@kernel/hooks/useViewport";

// internal imports
import useGraph from "@kernel/hooks/useGraph";
import { CompositionGraphState } from "modules/Composer/store/state";
import { Part } from "../../interfaces/Part";
import { partSelectedEvent } from "../../store/actions";
import ComposerLeftPanelContent from "./LeftPanelContent";
import SVGManager from "../SVGManager";
import Proxies from "../SVGManager/proxies";
import ComposerRightPanelContent from "./RightPanelContent";

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
  const graph = useGraph<CompositionGraphState>(viewport.state.id);

  useEffect(() => {
    if (!graph) {
      dispatch(newGraph(viewport.state.id));
    }
    viewport.panels.right.close();
    viewport.panels.right.setContent(<ComposerRightPanelContent />);
  }, [viewport.state.id]);

  const onPartsLoaded = () => {
    // QUESTION: How to do it with redux actions and middlewares?
    viewport.panels.left.setContent(<ComposerLeftPanelContent />);
  };

  const onPartSelected = (part: Part) => {
    dispatch(partSelectedEvent({ part }));
  };

  return (
    <Viewport innerRef={null} id={viewport.state.id}>
      {graph && (
        <SVGManager
          graphId={viewport.state.id}
          mannequinSize={mannequinSize}
          product={product}
          model={model}
        >
          <Proxies
            graphId={viewport.state.id}
            onPartsLoaded={onPartsLoaded}
            onPartSelected={onPartSelected}
          />
        </SVGManager>
      )}
    </Viewport>
  );
};

ComposerViewport.defaultProps = {
  mannequinSize: "p",
  product: "camiseta-fem",
  model: "modelo",
};

export default ComposerViewport;
