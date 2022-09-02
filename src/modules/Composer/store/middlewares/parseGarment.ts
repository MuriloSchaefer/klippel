import { createListenerMiddleware, ThunkDispatch } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import Node from "@kernel/modules/GraphsManager/interfaces/Node";
import Edge from "@kernel/modules/GraphsManager/interfaces/Edge";
import { addNode } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import { DEFAULT_PART_COLOR } from "modules/Composer/constants";
import { Garment } from "modules/Composer/interfaces/Garment";
import _, { isEmpty } from "lodash";
import {
  Part as Material,
  PartProperties as Properties,
} from "../../interfaces/Part";
import { garmentParseFinished, parseGarment } from "../actions";

const middleware = createListenerMiddleware();

const parseNode = (
  node: Element,
  parent: Node,
  baseProperties: Properties,
  graphId: string,
  dispatch: ThunkDispatch<unknown, unknown, AnyAction>
): void => {
  if (isEmpty(node.id)) {
    node.setAttribute("id", _.uniqueId("random_"));
  }

  // vector object, add part to graph
  const material: Material = {
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
  dispatch(addNode({ graphId, node: material }));
  if (node.tagName === "g") {
    // group element, recurse
    const children = Array.from(node.children);

    // const properties = children.filter((c) => c.tagName === "metadata");
    const parts = children.filter((c) => c.tagName !== "metadata");

    parts.forEach((innerMaterial) =>
      parseNode(innerMaterial, material, baseProperties, graphId, dispatch)
    );
  }
};

middleware.startListening({
  actionCreator: parseGarment,
  effect: (action: AnyAction, listenerApi) => {
    const { graphId, svgRoot } = action.payload;
    const { dispatch } = listenerApi;
    const children = Array.from<SVGAElement>(svgRoot.children);
    // const garmentProperties = children.filter((c) => c.tagName === "metadata");
    const garmentParts = children.filter((c) => c.tagName !== "metadata");

    const garmentRoot: Garment = {
      id: `garmentRoot`,
      type: "Garment",
      properties: {
        details: "",
      },
      baseProperties: {
        color: DEFAULT_PART_COLOR,
      },
      inputs: {
        root: {
          id: "root",
          sourceId: "root",
          targetId: "garmentRoot",
        },
      },
      outputs: {},
    };

    dispatch(addNode({ graphId, node: garmentRoot }));

    // group element, recurse
    garmentParts.forEach((part) =>
      parseNode(
        part,
        garmentRoot,
        garmentRoot.baseProperties,
        graphId,
        dispatch
      )
    );

    dispatch(garmentParseFinished({ graphId, svgRoot }));
  },
});

export default middleware;
