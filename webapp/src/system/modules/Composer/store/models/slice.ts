import { createSlice } from "@reduxjs/toolkit";
import { ComposerModuleState, Model } from "../../typings";
import { MODULE_NAME } from "../../constants";
import { modelsListed } from "./actions";
import type { PathLike } from "fs-extra";


import { defineRehydration, workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
storage.ensureDir(".session/Composer/models");
/**
 * `.session/Composer/models/<id>.json` is a per-workspace, filesystem-backed
 * cache of the model list. The Jazz CoValue tree (`jazz.sqlite`) is the
 * source of truth for model content; the session file is a fast-load cache
 * the slice rehydrates from so the renderer has the list before the first
 * `jazz.listModels()` round-trip completes.
 */
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
    // Replace, don't merge: `modelsListed` is the authoritative snapshot
    // from Jazz, so it must drop entries from a previous workspace that no
    // longer exist in the new one. A merge would leak stale models across
    // workspace switches (and is invisible in single-workspace UX).
    builder.addCase(modelsListed, (_state, { payload }) =>
      payload.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {}),
    );
    builder.addCase(modelsRehydrated, (_state, { payload }) => payload);
  },
});

export default slice;
