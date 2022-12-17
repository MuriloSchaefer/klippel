import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { createGraph, destroyGraph, graphCreated, graphDestroyed } from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: createGraph,
  effect: async (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    
    dispatch(graphCreated(action.payload)) // dispatch event
  },
});

middlewares.startListening({
  actionCreator: destroyGraph,
  effect: async (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;

    // check if exists 
    dispatch(graphDestroyed(action.payload)) // dispatch event

  },
});

export default middlewares;
