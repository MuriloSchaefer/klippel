import { createSlice, Store } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { initialState, MaterialsModuleState } from "./state";
import materialTypesSlice from './materialTypes/slice';
import materialsSlice from './materials/slice';
import { saveSession } from "./actions";
const storage = window.electron.storage;
storage.ensureDir(".session/SVG/svgs");

export const sessionSaver = (store: Store<MaterialsModuleState>) => () => {
  store.dispatch(saveSession());
};

const slice = createSlice({
    name: MODULE_NAME,
    initialState: {
      ...initialState,
      materials: materialsSlice.getInitialState(),
      materialTypes: materialTypesSlice.getInitialState()
    },
    reducers: {},
    extraReducers: (builder) => {
    //   builder.addCase(
    //     switchTheme,
    //     (state: MaterialsState, { payload: { theme } }) => ({...state, theme}))
        
      builder.addDefaultCase((state, action)=>({
        ...state, 
        materials: materialsSlice.reducer(state.materials, action),
        materialTypes: materialTypesSlice.reducer(state.materialTypes, action),
      }))
    }
})

export default slice;