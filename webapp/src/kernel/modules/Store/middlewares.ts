import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  createWorkspace,
  listWorkspaces,
  pauseSessionAutoSaver,
  resumeSessionAutoSaver,
  saveSession,
  selectWorkspace,
  sessionAutoSaverPaused,
  sessionAutoSaverResumed,
  sessionSaved,
  workspaceCreated,
  workspaceSelected,
  workspacesListed,
} from "./actions";
import { persistState } from "./slice";
import { StoreState } from "./state";

export function getWorkspaceFolder(getState: () => { Store: StoreState }) {
  const {
    Store: { selectedWorkspace },
  } = getState();

  return `workspaces/${selectedWorkspace}`
}

const storage = globalThis.electron.storage;
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
middlewares.startListening({
  actionCreator: listWorkspaces,
  effect: async (_, listenerApi) => {
    const { dispatch } = listenerApi;

    const list = await storage.searchDir<string[]>("workspaces", ["*"], {});

    dispatch(workspacesListed({ workspaces: list })); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: selectWorkspace,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(workspaceSelected(payload)); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: createWorkspace,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;

    storage.ensureDir(`./workspaces/${payload.name}`)
    dispatch(listWorkspaces())
    dispatch(workspaceCreated(payload)); // dispatch event
  },
});

export default middlewares;
