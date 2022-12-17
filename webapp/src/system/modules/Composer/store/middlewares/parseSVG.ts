import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { SVGInjected, SVGLoaded } from "@kernel/modules/SVGModule/store/actions";
import { addNode } from "@kernel/modules/Graphs/store/graphsManagerSlice";
import { GARMENT_ID } from "modules/Composer/constants";
import { SVGNode } from "modules/Composer/interfaces/svg";
import { parseGarment } from "../actions";
import { UIState } from "../state";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: SVGInjected,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const { path, DOMId }: { path: string; raw: string, DOMId:string } =
      action.payload;


    // get all affected viewports
    const {ComposerUI} = getState() as {ComposerUI: UIState}
    const viewports = Object.values(ComposerUI.viewports).filter(vp => vp.svgPath === path)

    // loop all them
    viewports.forEach(vp => {
      if(vp.UI.loaders.parseSVG.garment === "not-started"){
        const root: SVGNode = {
          id: `root`,
          tag: "svg",
          properties: {
            Nome: { value: "Documento", type: "string" },
          },
          inputs: {},
          outputs: {},
        };
        dispatch(addNode({ graphId: vp.graphId, node: root }));
        dispatch(parseGarment({ viewportId: vp.viewportId, svgDOMId: DOMId }));
      }
      
    })
  },
});

export default middleware;
