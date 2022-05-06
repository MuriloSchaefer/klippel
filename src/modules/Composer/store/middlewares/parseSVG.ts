import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { addNode } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import { MANNEQUIN_LAYER_ID, PARTS_LAYER_ID } from "modules/Composer/constants";
import { parseMannequin, parseParts, SVGLoaded } from "../actions";
import { Garment } from "../../interfaces/Garment";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: SVGLoaded,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    const { graphId, svgRoot }: { graphId: string; svgRoot: SVGElement } =
      action.payload;
    const root: Garment = {
      id: `root`,
      type: "Garment",
      properties: {},
      inputs: {},
      outputs: {},
    };

    dispatch(addNode({ graphId, node: root }));

    // Find parts
    const partsLayer = svgRoot.querySelectorAll<SVGElement>(
      `#${PARTS_LAYER_ID}`
    );
    if (partsLayer && partsLayer.length > 0) {
      dispatch(parseParts({ graphId, svgRoot: partsLayer[0] }));
    }

    // Find mannequin layer
    const mannequinLayer = svgRoot.querySelectorAll<SVGElement>(
      `#${MANNEQUIN_LAYER_ID}`
    );
    if (mannequinLayer && mannequinLayer.length > 0) {
      dispatch(parseMannequin({ graphId, svgRoot: mannequinLayer[0] }));
    }
  },
});

export default middleware;
