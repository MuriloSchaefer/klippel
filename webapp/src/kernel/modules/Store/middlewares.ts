import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  createWorkspace,
  enableWorkspaceSync,
  joinWorkspace,
  listWorkspaces,
  pauseSessionAutoSaver,
  peersRefreshed,
  refreshFromPeers,
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
  actionCreator: refreshFromPeers,
  effect: async (_, listenerApi) => {
    // Kernel-level orchestration point — modules with workspace-scoped
    // state listen on `peersRefreshed` and refetch from Jazz.
    //
    // Re-open the active workspace in the main process *first*. Each
    // domain `api.load()` call (e.g. Materials' `jazz.materials.load`)
    // reads through the cached workspace handle and its already-
    // resolved CoValue subtree — without a fresh resolve, a peer's
    // delta that arrived since the handle was opened isn't visible
    // even though it's sitting in cojson. `ensureWorkspace` does the
    // same re-resolution `selectWorkspace` does on a workspace switch,
    // which is why workspace switching has always refreshed correctly
    // and a bare `loadMaterialsCatalog` dispatch did not.
    const { Store: { selectedWorkspace } } =
      listenerApi.getState() as { Store: StoreState };

    

    // listenerApidispatch(selectWorkspace({ workspace: payload.name }));
    if (selectedWorkspace) {
      try {
        // Full close + reopen of the Jazz node. `ensureWorkspace` is a
        // no-op when the active workspace name already matches, which
        // means the cached `WorkspaceCoMap` handle (and its resolved
        // catalog subtree) stays in place — peer deltas held in cojson
        // are visible, but a fresh deep-resolve never happens, so the
        // renderer's `loadMaterialsCatalog` keeps returning the same
        // snapshot. `refreshWorkspace` releases the SQLite lock,
        // re-dials the sync peer, and re-creates the cojson context so
        // the next `requireActiveWorkspaceHandle` rebuilds the resolved
        // view from scratch.
        await jazz.refreshWorkspace(selectedWorkspace);
      } catch (err) {
        console.error("[Store/refreshFromPeers] Jazz refresh failed", err);
      }
    }
    listenerApi.dispatch(peersRefreshed());
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
    // Persist the new selection immediately so a renderer reload (HMR,
    // crash, or manual refresh) doesn't lose the active workspace and
    // silently fall back to "pessoal" — which would close the live Jazz
    // node and sever the sync connection.
    dispatch(saveSession());
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
