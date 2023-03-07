import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { initialState, MaterialsModuleState } from "./state";
import materialTypesSlice from './materialTypes/slice';
import materialsSlice from './materials/slice';


const slice = createSlice({
    name: MODULE_NAME,
    initialState: initialState,
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