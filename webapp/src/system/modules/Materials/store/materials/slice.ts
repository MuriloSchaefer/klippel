import { createSlice } from "@reduxjs/toolkit";
import { materialsLoaded } from "./actions";
//import { materialTypesLoaded } from "./actions";
import { initialState, MaterialsState } from "./state";


const slice = createSlice({
    name: 'materialsSlice',
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        materialsLoaded,
        (state: MaterialsState, { payload }) => ({...state, ...payload}))
    }
})

export default slice;