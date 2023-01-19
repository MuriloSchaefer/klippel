import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { switchTheme } from "./actions";
import viewportManagerSlice from "./viewports/slice";
import {
  layoutInitialState,LayoutState
} from "./state";


const slice = createSlice({
    name: MODULE_NAME,
    initialState: layoutInitialState,
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        switchTheme,
        (state: LayoutState, { payload: { theme } }) => ({...state, theme}))
      builder.addDefaultCase((state, action)=>({
        ...state, 
        viewportManager: viewportManagerSlice.reducer(state.viewportManager, action)
      }))
    }
})

export default slice;