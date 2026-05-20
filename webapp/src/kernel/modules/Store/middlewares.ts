import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  createWorkspace,
  enableWorkspaceSync,
  joinWorkspace,
  listWorkspaces,
  pauseSessionAutoSaver,
  resumeSessionAutoSaver,
  saveSession,
  selectWorkspace,
  sessionAutoSaverPaused,
  sessionAutoSaverResumed,
  sessionSaved,
  workspaceCreated,
  workspaceJoined,
  workspaceSelected,
  workspaceSyncEnabled,
  workspacesListed,
} from "./actions";
import { persistState } from "./slice";
import { runAllRehydrators, setCurrentWorkspace } from "./workspaceScope";
import { StoreState } from "./state";

export function getWorkspaceFolder(getState: () => { Store: StoreState }) {
  const {
    Store: { selectedWorkspace },
  } = getState();

  return `workspaces/${selectedWorkspace}`
}

const storage = globalThis.electron.storage;
const jazz = globalThis.electron.jazz;
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

    setCurrentWorkspace(payload.workspace);

    // Open the workspace's Jazz node before fan-out so Composer rehydrators
    // see a live `activeWorkspace` when they fire model IPC calls.
    // `ensureWorkspace` handles open-existing / fresh-bootstrap / stale-entry
    // cases in one round-trip.
    try {
      await jazz.ensureWorkspace(payload.workspace);
    } catch (err) {
      console.error("[Store/selectWorkspace] Jazz ensure failed", err);
    }

    // Re-read every persisted slice from the new workspace's `.session/` and
    // dispatch each slice's rehydrate action. This is the soft-reset path
    // (no page reload): slices swap their state in-place.
    const results = await runAllRehydrators();
    for (const { actionType, payload: slicePayload } of results) {
      dispatch({ type: actionType, payload: slicePayload });
    }

    dispatch(workspaceSelected(payload)); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: createWorkspace,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;

    let coId: string | undefined;
    try {
      const entry = await jazz.createWorkspace(payload.name);
      coId = entry.coId;
    } catch (err) {
      console.error("[Store] Jazz workspace creation failed", err);
      // Fall back to plain folder so the user is not blocked while we iterate
      // on the Jazz path. Old workspaces remain file-only.
      storage.ensureDir(`./workspaces/${payload.name}`);
    }

    dispatch(listWorkspaces());
    dispatch(workspaceCreated({ name: payload.name, coId }));
    // Auto-select the newly created workspace so the UI flips to it
    // immediately. Without this, the user (and the Share button which
    // gates on `workspaceCoIds[selectedWorkspace]`) stays on whatever
    // was active before — typically the bootstrap "pessoal".
    dispatch(selectWorkspace({ workspace: payload.name }));
  },
});
middlewares.startListening({
  actionCreator: joinWorkspace,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    // Unlike `createWorkspace`, there is no sensible offline fallback for a
    // failed join — the whole point is to reach a remote CoValue. Let the
    // error propagate so the renderer surfaces it instead of silently
    // leaving the user on the previous workspace.
    await jazz.joinWorkspace(payload);
    dispatch(listWorkspaces());
    dispatch(workspaceJoined(payload));
    // Auto-select the joined workspace so the user sees it immediately.
    dispatch(selectWorkspace({ workspace: payload.name }));
  },
});
middlewares.startListening({
  actionCreator: enableWorkspaceSync,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    try {
      await jazz.enableSync(payload.syncUrl);
      dispatch(workspaceSyncEnabled(payload));
    } catch (err) {
      console.error("[Store] enable workspace sync failed", err);
    }
  },
});

export default middlewares;
