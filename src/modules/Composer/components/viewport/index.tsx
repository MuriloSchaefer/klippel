import React from "react";
import Viewport, { ViewportProps } from "@kernel/layout/Viewport";
import { useAppDispatch } from "@kernel/store/hooks";

import Node from "@kernel/modules/Graph/interfaces/Node";

import SVGManager from "../SVGManager";
import IGraphModule from "@kernel/modules/Graph";
import useModule from "@kernel/hooks/useModule";

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
  console.log("rendering composer viewport");
  const graphModule = useModule<typeof IGraphModule>("graph");
  const { addNode } = graphModule.actions;

  const onPartsLoaded = (svgNode: SVGElement) => {
    const parts = Array.from(svgNode.children);

    console.log("adding parts", parts);
    parts.forEach((part) => {
      const node = { id: part.id } as Node;
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
