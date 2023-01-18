import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { switchTheme } from "./actions";
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
    }
})

export default slice;