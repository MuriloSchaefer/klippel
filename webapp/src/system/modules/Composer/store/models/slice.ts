import { createSlice } from "@reduxjs/toolkit";
import { ComposerModuleState, Model } from "../../typings";
import { MODULE_NAME } from "../../constants";
import { modelsListed } from "./actions";
import type { PathLike } from "fs-extra";


import { defineRehydration, workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
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

export const modelsRehydrated = defineRehydration<ComposerModuleState['models']>(
  `${MODULE_NAME}-models/rehydrated`,
  restoreModelsSession,
);

const slice = createSlice({
  name: `${MODULE_NAME}-models`,
  initialState: await restoreModelsSession(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(modelsListed, (state, { payload }) => ({
      ...state,
      ...payload.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {}),
    }));
    builder.addCase(modelsRehydrated, (_state, { payload }) => payload);
  },
});

export default slice;
