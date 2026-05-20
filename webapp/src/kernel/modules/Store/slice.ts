import { createSlice, Store } from "@reduxjs/toolkit";
import { MODULE_NAME } from "./constants";
import { StoreState } from "./state";
import {
  pauseSessionAutoSaver,
  resumeSessionAutoSaver,
  saveSession,
  selectWorkspace,
  workspacesListed,
  accountIdResolved,
  syncStatusChanged,
  workspaceCreated,
  workspaceJoined,
} from "./actions";
import { setCurrentWorkspace } from "./workspaceScope";
import type { PathLike } from "fs";

const initialState: StoreState = {
  sessionAutoSaveInterval: undefined,
  selectedWorkspace: 'pessoal',
  workspaces: ['pessoal'],
  workspaceCoIds: {},
  accountId: undefined,
  syncStatus: 'offline',
};

const storage = globalThis.electron.storage;
storage.ensureDir(".session/Store");

export const sessionSaver = (store: Store<StoreState>) => () => {
  store.dispatch(saveSession());
};

export function persistState(state: StoreState) {
  storage.writeBlob(
    ".session/Store/state.json",
    new Blob([JSON.stringify(state)]),
    {
      encoding: "utf-8",
    }
  );
  return state;
}
const restoreStoreSession = async (
  sessionPath: PathLike = ".session/Store"
) => {
  const exists = await storage.exists(`${sessionPath}/state.json`);
  if (!exists) return initialState;
  const fileContent = await storage.readFile<string>(
    `${sessionPath}/state.json`,
    { encoding: "utf-8" }
  );
  if (!fileContent?.trim()) return initialState;
  return JSON.parse(fileContent) as StoreState;
};

const initialStoreState = await restoreStoreSession();
setCurrentWorkspace(initialStoreState.selectedWorkspace);

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialStoreState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(pauseSessionAutoSaver, (state) => {
      return {
        ...state,
        sessionAutoSaveInterval: undefined,
      };
    });

    builder.addCase(
      resumeSessionAutoSaver,
      (state, { payload }) => ({
        ...state,
        sessionAutoSaveInterval: payload.interval,
      })
    );

    builder.addCase(
      workspacesListed,
      (state, { payload }) => ({
        ...state,
        workspaces: payload.workspaces
      })
    );
    builder.addCase(
      selectWorkspace,
      (state, { payload }) => ({
        ...state,
        selectedWorkspace: payload.workspace,
      })
    );
    builder.addCase(
      accountIdResolved,
      (state, { payload }) => ({
        ...state,
        accountId: payload.accountId ?? undefined,
      })
    );
    builder.addCase(
      syncStatusChanged,
      (state, { payload }) => ({
        ...state,
        syncStatus: payload.status,
      })
    );
    builder.addCase(
      workspaceCreated,
      (state, { payload }) => ({
        ...state,
        workspaceCoIds: payload.coId
          ? { ...state.workspaceCoIds, [payload.name]: payload.coId }
          : state.workspaceCoIds,
      })
    );
    // Joined workspaces carry the same coId/syncOptIn contract as created
    // ones — record the coId so the Share button can render the right
    // invite without re-querying main process.
    builder.addCase(
      workspaceJoined,
      (state, { payload }) => ({
        ...state,
        workspaceCoIds: { ...state.workspaceCoIds, [payload.name]: payload.coId },
      })
    );
  },
});

export default slice;
