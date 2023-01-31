import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { switchTheme } from "./actions";
import viewportManagerSlice from "./viewports/slice";
import ribbonMenuSlice from "./ribbonMenu/slice";
import panelsSlice from "./panels/slice";
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
        panels: panelsSlice.reducer(state.panels, action),
        ribbonMenu: ribbonMenuSlice.reducer(state.ribbonMenu, action),
        viewportManager: viewportManagerSlice.reducer(state.viewportManager, action)
      }))
    }
})

export default slice;