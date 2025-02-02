import { createSlice } from "@reduxjs/toolkit";
import { materialTypesLoaded } from "./actions";
import { initialState, MaterialTypesState } from "./state";

const storage = window.electron.storage;
storage.createDir(".session/Materials/materialTypes");
function persistMaterialTypes(state: MaterialTypesState){
  storage.write(".session/Materials/materials/state.js", JSON.stringify(state), {
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