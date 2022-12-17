import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "./constants";
import { StoreState } from "./state";

const initialState: StoreState = {}

const slice = createSlice({
    name: MODULE_NAME,
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
    }
})

export default slice

