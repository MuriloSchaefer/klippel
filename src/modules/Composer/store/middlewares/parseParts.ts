import { createListenerMiddleware, ThunkDispatch } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import Node from "@kernel/modules/GraphsManager/interfaces/Node";
import Edge from "@kernel/modules/GraphsManager/interfaces/Edge";
import { addNode } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import { DEFAULT_PART_COLOR } from "modules/Composer/constants";
import { Part, PartProperties, PartsLayer } from "../../interfaces/Part";
import { parseParts } from "../actions";
import { Composition } from "../../interfaces/Composition";

const middleware = createListenerMiddleware();

const parseNode = (
  node: Element,
  parent: Node,
  baseProperties: PartProperties,
  graphId: string,
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>
): void => {
  if (["path", "rect", "circle", "ellipse"].includes(node.tagName)) {
    // vector object, add part to graph
    const part: Part = {
      id: node.id,
      type: "Part",
      properties: baseProperties,
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
    const compositionNode: Composition = {
      id: node.id,
      type: "Composition",
      properties: {},
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
    parts.forEach((part) =>
      parseNode(part, compositionNode, baseProperties, graphId, dispatch)
    );
  }
};

middleware.startListening({
  actionCreator: parseParts,
  effect: (action: AnyAction, listenerApi) => {
    const { graphId, svgRoot } = action.payload;
    const { dispatch } = listenerApi;
    const partsLayer: PartsLayer = {
      id: `partsLayer`,
      type: "PartsLayer",
      baseProperties: {
        color: DEFAULT_PART_COLOR,
      },
      inputs: {
        root: {
          id: "root-partsLayer",
          sourceId: "root",
          targetId: "partsLayer",
        },
      },
      outputs: {},
    };

    dispatch(addNode({ graphId, node: partsLayer }));

    // group element, recurse
    const parts = Array.from<SVGAElement>(svgRoot.children);
    parts.forEach((part) =>
      parseNode(part, partsLayer, partsLayer.baseProperties, graphId, dispatch)
    );
  },
});

export default middleware;
