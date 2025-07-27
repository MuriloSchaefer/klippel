import { createSlice, Store } from "@reduxjs/toolkit";
import { ComposerModuleState, Model } from "../../typings";
import { modelsListed, saveSession } from "./actions";
import { MODULE_NAME } from "../../constants";
import type { PathLike } from "fs-extra";


const storage = window.electron.storage;
storage.ensureDir(".session/Composer/models");
export function persistModelState(state: Model) {
  storage.writeBlob(
    `.session/Composer/models/${state.id}.json`,
    new Blob([JSON.stringify(state)]),
    {
      encoding: "utf-8",
    }
  );
  return state;
}

const restoreModelsSession = async (
  sessionPath: PathLike = ".session/Composer/models"
) => {
  const files = await storage.searchDir<string[]>(sessionPath, ["**/*.json"], {});
  const state = await files.reduce(async (acc, file) => {
    const fileContent = await storage.readFile<string>(
      `${sessionPath}/${file}`,
      { encoding: "utf-8" }
    );
    const content = JSON.parse(fileContent) as Model;
    return { ...(await acc), [content.id]: content };
  }, {});
  return state as ComposerModuleState['models'];
};

export const sessionSaver = (store: Store<ComposerModuleState>) => () => {
  store.dispatch(saveSession());
};

export function persistModel(state: Model){
  const basePath = ".session/Composer/models/"
  storage.writeBlob(`${basePath}/${state.id}.json`, new Blob([JSON.stringify(state)]), {
      encoding: "utf-8",
    });
  return state
}

const slice = createSlice({
  name: `${MODULE_NAME}-models`,
  initialState: await restoreModelsSession(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(modelsListed, (state, { payload }) => ({
      ...state,
      ...payload.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {}),
    }));
  },
});

export default slice;
