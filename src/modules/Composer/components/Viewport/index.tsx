import React, { useEffect } from "react";

import { SvgProxy } from "react-svgmt";

import useLeftPanel from "@kernel/layout/components/Sidepanels/hooks/useLeftPanel";
import Viewport, { ViewportProps } from "@kernel/layout/components/Viewport";
import useCustomEventListener from "@kernel/events/hooks/useEventListener";
import { IGraphModule } from "@kernel/modules/GraphsManager";
import { useAppDispatch } from "@kernel/store/hooks";
import useModule from "@kernel/hooks/useModule";

import { parseMannequin, parseParts } from "modules/Composer/store/actions";
import { MannequinChangeEvent } from "./LeftPanelContent/events/MannequinChange";
import ComposerLeftPanelContent from "./LeftPanelContent";
import SVGManager from "../SVGManager";

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
  const dispatch = useAppDispatch();

  // States
  const graphsManager = useModule<IGraphModule>("GraphsManager");
  const { newGraph, removeGraph, updateNode } = graphsManager.store.actions;

  const graphId = "composer";

  // Hooks
  useEffect(() => {
    dispatch(newGraph(graphId));

    return () => dispatch(removeGraph(graphId));
  }, []);

  const { leftPanel, setLeftPanel } = useLeftPanel();

  useCustomEventListener<MannequinChangeEvent>("mannequin-change", (e) => {
    console.log(e);
    // update attr node in graph
    dispatch(
      updateNode({
        graphId,
        node: { ...e.newAttributes, id: "mannequinAttributes" },
      })
    );
  });

  const onPartsLoaded = (svgRoot: SVGElement) => {
    dispatch(parseParts({ graphId, svgRoot }));

    // QUESTION: How to do it with redux actions and middlewares?
    setLeftPanel({
      ...leftPanel,
      title: "Compositor",
      content: <ComposerLeftPanelContent compositionGraphId={graphId} />,
    });
  };

  const onMannequinLoaded = (svgRoot: SVGElement) => {
    dispatch(parseMannequin({ graphId, svgRoot }));
  };

  return (
    <Viewport innerRef={innerRef}>
      <SVGManager mannequinSize={mannequinSize} product={product} model={model}>
        <SvgProxy
          selector="#partes"
          fill="red"
          onElementSelected={onPartsLoaded}
        />
        <SvgProxy
          selector="#maneco"
          fill="#00ff00"
          onElementSelected={onMannequinLoaded}
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
