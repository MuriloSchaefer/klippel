import React from "react";

import Viewport, { ViewportProps } from "@kernel/layout/Viewport";
import { useAppDispatch } from "@kernel/store/hooks";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graph";

import SVGManager from "../SVGManager";
import Part from "../../interfaces/Part";

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
  const graphModule = useModule<IGraphModule>("graph");
  const { addNode } = graphModule.actions;

  const onPartsLoaded = (svgNode: SVGElement) => {
    const parts = Array.from(svgNode.children);

    parts.forEach((part) => {
      const node = { id: part.id, type: "Part", element: part } as Part;
      dispatch(addNode(node));
    });
  };

  return (
    <Viewport innerRef={innerRef}>
      <SVGManager
        mannequinSize={mannequinSize}
        product={product}
        model={model}
        onPartsLoaded={onPartsLoaded}
      />
    </Viewport>
  );
};

ComposerViewport.defaultProps = {
  mannequinSize: "p",
  product: "camiseta-fem",
  model: "modelo",
};

export default ComposerViewport;
