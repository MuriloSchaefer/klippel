import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { createGraph, destroyGraph, graphCreated, graphDestroyed, saveSession, SessionSaved } from "./actions";
import { GraphsManagerState } from "../state";
import { persistState } from "../graphInstance/slice";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: saveSession,
  effect: async (payload, listenerApi) => {
      const { dispatch, getState } = listenerApi;
      
      const {Graph: state} = getState() as { Graph: GraphsManagerState }
      Object.values(state.graphs).forEach(persistState)

      dispatch(SessionSaved()); // dispatch event
  }
})

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
