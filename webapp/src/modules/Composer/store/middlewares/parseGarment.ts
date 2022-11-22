import { createListenerMiddleware, ThunkDispatch } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import _, { isEmpty } from "lodash";
import Node from "@kernel/modules/GraphsModule/interfaces/Node";
import Edge from "@kernel/modules/GraphsModule/interfaces/Edge";
import { addNode } from "@kernel/modules/GraphsModule/store/graphsManagerSlice";

import { Garment } from "modules/Composer/interfaces/Garment";
import { Material, Properties } from "../../interfaces/Material";
import { garmentParseFinished, parseGarment } from "../actions";
import { UIState } from "../state";
import { GARMENT_ID } from "modules/Composer/constants";

const middleware = createListenerMiddleware();

const xdom2properties = (node: Element): Properties => {
  const children = Array.from(node.children);
  const metadata = children.find((c) => c.tagName === "metadata");
  if (!metadata) return {} as Properties;

  const odmProperties = Array.from(metadata.children);
  const properties = odmProperties.reduce((acc, property) => {
    const name = property.getAttribute("xodm:name");
    const value = property.getAttribute("xodm:value");
    const type = property.getAttribute("xodm:type");

    if (!name || !value || !type) return acc;

    return { ...acc, [name]: { value, type } };
  }, {} as Properties);

  return properties;
};
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
  // group element, recurse
  const children = Array.from(node.children);
  const hasChildren = !isEmpty(children);

  // vector object, add material to graph
  const material: Material = {
    id: node.id,
    type: "Material",
    properties: { ...baseProperties, ...xdom2properties(node) },
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
  if (hasChildren) {
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
    const { viewportId, svgDOMId } = action.payload;
    const { dispatch, getState } = listenerApi;

    const {ComposerUI:{viewports}} = getState() as {ComposerUI: UIState} 
    const composerViewport = viewports[viewportId]
    const [root] = [...document.querySelectorAll(`#${svgDOMId}>div>svg`)] as [SVGElement]
    const garmentRoot = root.querySelector(`g[id="${GARMENT_ID}"]`)
    if (!garmentRoot) return
    const children = Array.from<any>(garmentRoot.children); // TODO: fix typing
    // const garmentProperties = children.filter((c) => c.tagName === "metadata");
    const garmentParts = children.filter((c) => !["metadata", "defs"].includes(c.tagName));


    const garmentRootNode: Garment = {
      id: `garmentRoot`,
      type: "Garment",
      properties: xdom2properties(garmentRoot),
      baseProperties: {},
      inputs: {
        root: {
          id: "root-garmentRoot",
          sourceId: "root",
          targetId: "garmentRoot",
        },
      },
      outputs: {},
    };

    dispatch(addNode({ graphId:composerViewport.graphId, node: garmentRootNode }));

    // group element, recurse
    garmentParts.forEach((part) =>
      parseNode(
        part,
        garmentRootNode,
        garmentRootNode.baseProperties,
        composerViewport.graphId,
        dispatch
      )
    );

    dispatch(garmentParseFinished({ viewportId: composerViewport.viewportId, svgDOMId }));
  },
});

export default middleware;
