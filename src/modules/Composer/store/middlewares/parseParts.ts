import { createListenerMiddleware, ThunkDispatch } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import Node from "@kernel/modules/GraphsManager/interfaces/Node";
import Edge from "@kernel/modules/GraphsManager/interfaces/Edge";
import { addNode } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import Part from "../../interfaces/Part";
import { parseParts } from "../actions";
import Composite from "../../interfaces/Composite";

const middleware = createListenerMiddleware();

const parseNode = (
  node: Element,
  parent: Node,
  graphId: string,
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>
): void => {
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
    parts.forEach((part) =>
      parseNode(part, compositionNode, graphId, dispatch)
    );
  }
};

middleware.startListening({
  actionCreator: parseParts,
  effect: (action: AnyAction, listenerApi) => {
    const root: Part = {
      id: `root`,
      type: "Root",
      inputs: {},
      outputs: {},
    };

    const { graphId, svgRoot } = action.payload;

    listenerApi.dispatch(addNode({ graphId, node: root }));

    parseNode(svgRoot, root, graphId, listenerApi.dispatch);
  },
});

export default middleware;
