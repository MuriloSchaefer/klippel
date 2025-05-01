import { createSlice } from "@reduxjs/toolkit";
import { materialsLoaded } from "./actions";
//import { materialTypesLoaded } from "./actions";
import { initialState, MaterialsState } from "./state";

const storage = window.electron.storage;
storage.ensureDir(".session/Materials/materials");
function persistMaterials(state: MaterialsState){
  storage.writeBlob(".session/Materials/materials/state.js", new Blob([JSON.stringify(state)]), {
    encoding: "utf-8",
  });
  return state
}

const slice = createSlice({
    name: 'materialsSlice',
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        materialsLoaded,
        (state: MaterialsState, { payload }) => persistMaterials({...state, ...payload}))
    }
})

export default slice;