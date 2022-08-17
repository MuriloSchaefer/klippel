import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { rightPanelOpened } from "@kernel/layout/ations";
import { partSelectedEvent } from "../actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: partSelectedEvent,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(rightPanelOpened());
  },
});

export default middleware;
