import React, { useEffect } from "react";

import { SvgProxy } from "react-svgmt";

import { useLeftPanel } from "@kernel/layout/components/Sidepanels/contexts/LeftPanelContext";
import Viewport, { ViewportProps } from "@kernel/layout/components/Viewport";
import useCustomEventListener from "@kernel/events/hooks/useEventListener";
import Node from "@kernel/modules/GraphsManager/interfaces/Node";
import { IGraphModule } from "@kernel/modules/GraphsManager";
import { useAppDispatch } from "@kernel/store/hooks";
import useModule from "@kernel/hooks/useModule";

import Edge from "@kernel/modules/GraphsManager/interfaces/Edge";
import { MannequinChangeEvent } from "./LeftPanelContent/events/MannequinChange";
import ComposerLeftPanelContent from "./LeftPanelContent";
import SVGManager from "../SVGManager";
import {
  MannequinLayer,
  MannequinAttributes,
  MannequinView,
} from "../../interfaces/Mannequin";
import Composite from "../../interfaces/Composite";
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

  // States
  const graphsManager = useModule<IGraphModule>("GraphsManager");
  const { newGraph, removeGraph, addNode, updateNode } =
    graphsManager.store.actions;

  const graphId = "composer";
  const root: Part = {
    id: `${product}_${model}`,
    type: "Root",
    inputs: {},
    outputs: {},
  };

  // Hooks
  useEffect(() => {
    dispatch(newGraph(graphId));
    dispatch(addNode({ graphId, node: root }));

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

  const parseElements = (node: Element, parent: Node): void => {
    if (["path", "rect", "circle", "ellipse"].includes(node.tagName)) {
      // vector object, add part to graph
      const part: Part = {
        id: node.id,
        type: "Part",
        inputs: {
          [parent.id]: {
            id: `${parent.id}-${node.id}`,
            sourceId: parent.id,
            targetId: node.id,
          } as Edge,
        },
        outputs: {},
      };
      dispatch(addNode({ graphId, node: part }));
    } else if (node.tagName === "g") {
      // group object, add part to graph
      const compositionNode: Composite = {
        id: node.id,
        type: "Composition",
        inputs: {
          [parent.id]: {
            id: `${parent.id}_${node.id}`,
            sourceId: parent.id,
            targetId: node.id,
          } as Edge,
        },
        outputs: {},
      };
      dispatch(addNode({ graphId, node: compositionNode }));

      // group element, recurse
      const parts = Array.from(node.children);
      parts.forEach((part) => parseElements(part, compositionNode));
    }
  };

  const onPartsLoaded = (svgNode: SVGElement) => {
    dispatch({ type: "[Composer] Parse Elements" });
    parseElements(svgNode, root);
    setLeftPanel({
      ...leftPanel,
      title: "Compositor",
      content: (
        <ComposerLeftPanelContent
          compositionGraphId={graphId}
          rootId={root.id}
        />
      ),
    });
  };

  const onMannequinLoaded = (svgNode: SVGElement) => {
    const views = Array.from(svgNode.children);

    const mannequinLayerNode: MannequinLayer = {
      id: "mannequinLayer",
      type: "MannequinLayer",
      inputs: {
        [root.id]: {
          id: `${root.id}-mannequinLayer`,
          sourceId: root.id,
          targetId: "mannequinLayer",
        } as Edge,
      },
      outputs: {},
    };
    const mannequinAttributesNode: MannequinAttributes = {
      id: "mannequinAttributes",
      type: "MannequinAttributes",
      skinColor: "#ff0000",
      inputs: {
        [mannequinLayerNode.id]: {
          id: `${mannequinLayerNode.id}_"mannequinAttributes"`,
          sourceId: mannequinLayerNode.id,
          targetId: "mannequinAttributes",
        } as Edge,
      },
      outputs: {},
    };

    dispatch(addNode({ graphId, node: mannequinLayerNode }));
    dispatch(addNode({ graphId, node: mannequinAttributesNode }));

    views.forEach((view) => {
      const node: MannequinView = {
        id: view.id,
        type: "MannequinView",
        inputs: {
          [mannequinLayerNode.id]: {
            id: `${mannequinLayerNode.id}${view.id}`,
            sourceId: mannequinLayerNode.id,
            targetId: view.id,
          },
        },
        outputs: {},
      };
      dispatch(addNode({ graphId, node }));
    });
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
