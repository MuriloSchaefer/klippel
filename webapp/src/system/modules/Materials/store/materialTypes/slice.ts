import { createSlice } from "@reduxjs/toolkit";
import { materialTypesLoaded } from "./actions";
import { initialState, MaterialTypesState } from "./state";

const storage = window.electron.storage;
storage.ensureDir(".session/Materials/materialTypes");
function persistMaterialTypes(state: MaterialTypesState){
  storage.writeBlob(".session/Materials/materials/state.js", new Blob([JSON.stringify(state)]), {
    encoding: "utf-8",
  });
  return state
}


const slice = createSlice({
    name: 'materialTypesSlice',
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        materialTypesLoaded,
        (state: MaterialTypesState, { payload }) => persistMaterialTypes({...state, ...payload}))
    }
})

export default slice;