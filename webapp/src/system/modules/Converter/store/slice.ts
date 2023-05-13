import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";

import {
  initialState
} from "./state";


const slice = createSlice({
    name: MODULE_NAME,
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
    //   builder.addCase(
    //     switchTheme,
    //     (state: ConverterState, { payload: { theme } }) => ({...state, theme}))
        
    //   builder.addDefaultCase((state, action)=>({
    //     ...state, 
    //     panels: panelsSlice.reducer(state.panels, action),
    //     ribbonMenu: ribbonMenuSlice.reducer(state.ribbonMenu, action),
    //     viewportManager: viewportManagerSlice.reducer(state.viewportManager, action)
    //   }))
    }
})

export default slice;