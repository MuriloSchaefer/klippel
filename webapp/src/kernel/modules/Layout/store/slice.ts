import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import {
  layoutInitialState
} from "./state";


const slice = createSlice({
    name: MODULE_NAME,
    initialState: layoutInitialState,
    reducers: {},
    extraReducers: (builder) => {
    }
})

export default slice;