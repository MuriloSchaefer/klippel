import { createSlice, Store } from "@reduxjs/toolkit";
import { MODULE_NAME } from "./constants";
import { StoreState } from "./state";
import {
  pauseSessionAutoSaver,
  resumeSessionAutoSaver,
  saveSession,
  selectWorkspace,
  workspacesListed,
} from "./actions";
import { setCurrentWorkspace } from "./workspaceScope";
import type { PathLike } from "fs";

const initialState: StoreState = {
  sessionAutoSaveInterval: undefined,
  selectedWorkspace: 'pessoal',
  workspaces: ['pessoal']
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

    
  },
});

export default slice;
