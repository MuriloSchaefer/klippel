import { createSlice } from "@reduxjs/toolkit";
import { materialsLoaded } from "./actions";
import { MaterialsState, MaterialState } from "./state";
import { PathLike } from "fs";

import { forWorkspace, getCurrentWorkspace } from "@kernel/modules/Store/workspaceScope";
const storage = forWorkspace(await getCurrentWorkspace());
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

const slice = createSlice({
    name: 'materialsSlice',
    initialState: await restoreMaterialsSession(),
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        materialsLoaded,
        (state: MaterialsState, { payload }) => ({...state, ...payload}))
    }
})

export default slice;