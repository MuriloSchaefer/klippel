import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { rightPanelOpened } from "@kernel/modules/LayoutManager/ations";
import { materialSelectedEvent } from "../actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: materialSelectedEvent,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(rightPanelOpened());
  },
});

export default middleware;
