import React from "react";

import { SvgProxy } from "react-svgmt";

import Viewport, { ViewportProps } from "@kernel/layout/Viewport";
import { useAppDispatch } from "@kernel/store/hooks";
import useModule from "@kernel/hooks/useModule";

import { IGraphModule } from "@kernel/modules/Graph";
import Node from "@kernel/modules/Graph/interfaces/Node";

import Composite from "modules/Composer/interfaces/Composite";
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
  const { addNode, addEdge } = graphModule.actions;

  const parseElements = (node: Element, parent: Node): void => {
    if (node.tagName === "path") {
      // vector object, add part to graph
      const part: Part = {
        id: node.id,
        type: "Part",
        inputs: {},
        outputs: {},
      };
      dispatch(addNode(part));
      dispatch(
        addEdge({
          id: `${parent.id}-${part.id}`,
          sourceId: parent.id,
          targetId: part.id,
        })
      );
    } else if (node.tagName === "g") {
      // vector object, add part to graph
      const compositionNode: Composite = {
        id: node.id,
        type: "Composition",
        inputs: {
          [parent.id]: {
            id: `${parent.id}_${node.id}`,
            sourceId: parent.id,
            targetId: node.id,
          },
        },
        outputs: {},
      };
      dispatch(addNode(compositionNode));

      dispatch(
        addEdge({
          id: `${parent.id}-${compositionNode.id}`,
          sourceId: parent.id,
          targetId: compositionNode.id,
        })
      );

      // group element, recurse
      const parts = Array.from(node.children);
      parts.forEach((part) => parseElements(part, compositionNode));
    }
  };

  const onPartsLoaded = (svgNode: SVGElement) => {
    const root: Part = {
      id: "root",
      type: "Root",
      inputs: {},
      outputs: {},
    };
    dispatch(addNode(root));
    parseElements(svgNode, root);
  };

  return (
    <Viewport innerRef={innerRef}>
      <SVGManager mannequinSize={mannequinSize} product={product} model={model}>
        <SvgProxy
          selector="#partes"
          fill="red"
          onElementSelected={onPartsLoaded}
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
