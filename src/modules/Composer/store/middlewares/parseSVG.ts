import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { addNode } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import { GARMENT_ID } from "modules/Composer/constants";
import { SVGNode } from "modules/Composer/interfaces/svg";
import { parseGarment, SVGLoaded } from "../actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: SVGLoaded,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    const { graphId, svgRoot }: { graphId: string; svgRoot: SVGElement } =
      action.payload;
    const root: SVGNode = {
      id: `root`,
      tag: "svg",
      properties: {
        Nome: { value: "Documento", type: "string" },
      },
      inputs: {},
      outputs: {},
    };
    console.log(svgRoot);
    dispatch(addNode({ graphId, node: root }));

    // Find defs
    // const svgDefinitions = svgRoot.querySelector<SVGElement>("defs");
    // if (svgDefinitions) {
    //   console.log(svgDefinitions);
    // }

    // Find parts
    const garmentObject = svgRoot.querySelectorAll<SVGElement>(
      `#${GARMENT_ID}`
    );

    if (garmentObject && garmentObject.length > 0) {
      dispatch(parseGarment({ graphId, svgRoot: garmentObject[0] }));
    }
  },
});

export default middleware;
