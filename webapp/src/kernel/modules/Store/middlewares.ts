import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  pauseSessionAutoSaver,
  resumeSessionAutoSaver,
  saveSession,
  sessionAutoSaverPaused,
  sessionAutoSaverResumed,
  sessionSaved,
} from "./actions";
import { persistState } from "./slice";
import { StoreState } from "./state";
const storage = window.electron.storage;
const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: saveSession,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;

    const { Store: state } = getState() as { Store: StoreState };
    persistState(state);

    dispatch(sessionSaved()); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: pauseSessionAutoSaver,
  effect: async (_, listenerApi) => {
    const { dispatch } = listenerApi;

    storage.pauseAutoSessionSaver();

    dispatch(sessionAutoSaverPaused()); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: resumeSessionAutoSaver,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;

    storage.resumeAutoSessionSaver(payload.interval);

    dispatch(sessionAutoSaverResumed()); // dispatch event
  },
});

export default middlewares;
