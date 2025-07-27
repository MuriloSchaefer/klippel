import { createSlice } from "@reduxjs/toolkit";
import { ComposerModuleState, Model } from "../../typings";
import { MODULE_NAME } from "../../constants";
import type { PathLike } from "fs-extra";
import { modelOpened } from "./actions";

const storage = window.electron.storage;
storage.ensureDir(".session/Composer/variations");
export function persistVariation(state: Model) {
  storage.writeBlob(
    `.session/Composer/variations/${state.id}.json`,
    new Blob([JSON.stringify(state)]),
    {
      encoding: "utf-8",
    }
  );
  return state;
}

const restoreModelsSession = async (
  sessionPath: PathLike = ".session/Composer/variations"
) => {
  const files = await storage.searchDir<string[]>(
    sessionPath,
    ["**/*.json"],
    {}
  );
  const state = await files.reduce(async (acc, file) => {
    const fileContent = await storage.readFile<string>(
      `${sessionPath}/${file}`,
      { encoding: "utf-8" }
    );
    const content = JSON.parse(fileContent) as Model;
    return { ...(await acc), [content.id]: content };
  }, {});
  return state as ComposerModuleState["variations"];
};

const slice = createSlice({
  name: `${MODULE_NAME}-variations`,
  initialState: await restoreModelsSession(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(modelOpened, (state, { payload: { model } }) => ({
      ...state,
      [model.variationId]: model,
    }));
  },
});

export default slice;
