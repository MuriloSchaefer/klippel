import React, { useEffect } from "react";

import useLeftPanel from "@kernel/layout/components/Sidepanels/hooks/useLeftPanel";
import Viewport, { ViewportProps } from "@kernel/layout/components/Viewport";
import { useAppDispatch } from "@kernel/store/hooks";

import {
  newGraph,
  removeGraph,
} from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import Part from "modules/Composer/interfaces/Part";
import { partSelectedEvent } from "modules/Composer/store/actions";
import useRightPanel from "@kernel/layout/components/Sidepanels/hooks/useRightPanel";
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
  innerRef,
  mannequinSize = "p",
  product = "camiseta-fem",
  model = "modelo",
}: ComposerViewportProps) => {
  const graphId = "composer";

  // Hooks
  const dispatch = useAppDispatch();
  const { leftPanel, setLeftPanel } = useLeftPanel();
  const { rightPanel, setRightPanel } = useRightPanel();
  useEffect(() => {
    dispatch(newGraph(graphId));

    return () => dispatch(removeGraph(graphId));
  }, []);

  const onPartsLoaded = () => {
    // QUESTION: How to do it with redux actions and middlewares?
    setLeftPanel({
      ...leftPanel,
      title: "Compositor",
      content: <ComposerLeftPanelContent compositionGraphId={graphId} />,
    });
  };

  const onPartSelected = (part: Part) => {
    dispatch(partSelectedEvent({ part }));

    setRightPanel({
      ...rightPanel,
      title: part.id,
      content: (
        <ComposerRightPanelContent
          compositionGraphId={graphId}
          selectedPart={part.id}
        />
      ),
    });
  };

  return (
    <Viewport innerRef={innerRef}>
      <SVGManager
        graphId={graphId}
        mannequinSize={mannequinSize}
        product={product}
        model={model}
      >
        <Proxies
          graphId={graphId}
          onPartsLoaded={onPartsLoaded}
          onPartSelected={onPartSelected}
        />
      </SVGManager>
    </Viewport>
  );
};

ComposerViewport.defaultProps = {
  mannequinSize: "p",
  product: "camiseta-fem",
  model: "modelo",
};

export default ComposerViewport;
