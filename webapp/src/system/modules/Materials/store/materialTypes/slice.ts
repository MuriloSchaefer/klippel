import { createSlice } from "@reduxjs/toolkit";
import { materialTypesLoaded } from "./actions";
import { MaterialType, MaterialTypesState } from "./state";
import { PathLike } from "fs";

const storage = globalThis.electron.storage;
storage.ensureDir(".session/Materials/materialTypes");
export function persistMaterialTypes(state: MaterialTypesState){
  Object.entries(state).forEach(([key, value]) => {
    storage.writeBlob(`.session/Materials/materialTypes/${key}.json`, new Blob([JSON.stringify(value)]), {
      encoding: "utf-8",
    });
  })
  return state
}

const restoreMaterialTypesSession = async (sessionPath: PathLike = ".session/Materials/materialTypes") => {
  const files = await storage.searchDir(sessionPath, ['*.json'], { withFileTypes: true, });
  const state = await files.reduce(async (acc, file) => {
    const fileContent = await storage.readFile<string>(`${sessionPath}/${file.name}`, {encoding: 'utf-8'});
    const content = JSON.parse(fileContent) as MaterialType;
    return {...await acc, [content.name]: content};
  }, {} )
  return state as MaterialTypesState;
}

const slice = createSlice({
    name: 'materialTypesSlice',
    initialState: await restoreMaterialTypesSession(),
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        materialTypesLoaded,
        (state: MaterialTypesState, { payload }) => ({...state, ...payload}))
    }
})

export default slice;