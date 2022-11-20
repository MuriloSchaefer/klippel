import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { storeSVG, SVGLoaded } from "./actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: storeSVG,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(SVGLoaded({path: action.payload.path}))
  },
});

export default middleware;
