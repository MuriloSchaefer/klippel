import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import Edge from "@kernel/modules/GraphsManager/interfaces/Edge";
import { addNode } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";

import {
  MannequinLayer,
  MannequinView,
} from "modules/Composer/interfaces/Mannequin";
import { DEFAULT_MANNEQUIN_COLOR } from "modules/Composer/constants";
import { parseMannequin } from "../actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: parseMannequin,
  effect: (action: AnyAction, listenerApi) => {
    const { graphId, svgRoot }: { graphId: string; svgRoot: SVGElement } =
      action.payload;
    const { dispatch } = listenerApi;

    const views = Array.from(svgRoot.children);

    const mannequinLayerNode: MannequinLayer = {
      id: `mannequinLayer`,
      type: "MannequinLayer",
      properties: {
        skinColor: DEFAULT_MANNEQUIN_COLOR,
      },
      inputs: {
        root: {
          id: "root-mannequinLayer",
          sourceId: "root",
          targetId: "mannequinLayer",
        } as Edge,
      },
      outputs: {},
    };

    dispatch(addNode({ graphId, node: mannequinLayerNode }));

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
  },
});

export default middleware;