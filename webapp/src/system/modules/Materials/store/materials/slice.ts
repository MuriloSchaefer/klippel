import { createSlice } from "@reduxjs/toolkit";
import { materialsLoaded } from "./actions";
import { MaterialsState, MaterialState } from "./state";
import { PathLike } from "fs";

import { defineRehydration, workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
storage.ensureDir(".session/Materials/materials");
export function persistMaterial(state: MaterialsState){
  Object.entries(state).forEach(([key, value]) => {
    storage.writeBlob(`.session/Materials/materials/${key}.json`, new Blob([JSON.stringify(value)]), {
      encoding: "utf-8",
    });

  })
  return state
}

const restoreMaterialsSession = async (sessionPath: PathLike = ".session/Materials/materials") => {
  const files = await storage.searchDir(sessionPath, ['*.json'], { withFileTypes: true, });
  const state = await files.reduce(async (acc, file) => {
    const fileContent = await storage.readFile<string>(`${sessionPath}/${file.name}`, {encoding: 'utf-8'});
    const content = JSON.parse(fileContent) as MaterialState;
    return {...await acc, [content.id]: content};
  }, {} )
  return state as MaterialsState;
}

export const materialsRehydrated = defineRehydration<MaterialsState>(
  'materialsSlice/rehydrated',
  restoreMaterialsSession,
);

const slice = createSlice({
    name: 'materialsSlice',
    initialState: await restoreMaterialsSession(),
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        materialsLoaded,
        (state: MaterialsState, { payload }) => ({...state, ...payload}))
      builder.addCase(materialsRehydrated, (_state, { payload }) => payload);
    }
})

export default slice;