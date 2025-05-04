import { createListenerMiddleware } from "@reduxjs/toolkit";
import { saveSession, sessionSaved } from "./actions";
import { LoaderState } from "./state";
import { persistState } from "./slice";


const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (payload, listenerApi) => {
      const { dispatch, getState } = listenerApi;
      
      const {Loader: state} = getState() as { Loader: LoaderState }
      persistState(state)

      dispatch(sessionSaved()); // dispatch event
  }
})