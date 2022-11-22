import { ActionCreatorWithPayload, createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { loadSVG, updateProxy, storeSVG, SVGLoaded, syncProxy, createProxy } from "./actions";
import { SVGModuleState } from "./state";

const middleware = createListenerMiddleware();
middleware.startListening({
  actionCreator: loadSVG,
  effect: async (action: AnyAction, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const response = await fetch(action.payload.path);
    const raw = await (await response.blob()).text();
    dispatch(storeSVG({path: action.payload.path, raw})) // dispatch action to store in redux

    const {SVGModule} = getState() as {SVGModule: SVGModuleState}

    dispatch(SVGLoaded({path: action.payload.path, DOMId: SVGModule.svgs[action.payload.path].DOMid})) // dispatch event
  },
});

middleware.startListening({
  actionCreator: syncProxy,
  effect: async (action: AnyAction, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {path, proxy} = action.payload;

    // check if exists 
    const {SVGModule} = getState() as {SVGModule: SVGModuleState}
    const svg = path in SVGModule.svgs ? SVGModule.svgs[path] : undefined

    if (svg && proxy.id in svg?.proxies) {
      dispatch(updateProxy(action.payload))
    } else {
      dispatch(createProxy(action.payload))
    }

  },
});

export default middleware;
