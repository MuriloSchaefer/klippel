import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { rightPanelClosed } from "@kernel/layout/ations";
import { materialUnSelectedEvent } from "../actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: rightPanelClosed,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(materialUnSelectedEvent());
  },
});

export default middleware;
