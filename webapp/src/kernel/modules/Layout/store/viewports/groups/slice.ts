import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../../constants";
import {
    ViewportGroups,
} from "../state";
import { createGroup } from "./actions";


const slice = createSlice<ViewportGroups, SliceCaseReducers<ViewportGroups>, string>({
    name: `${MODULE_NAME}ViewportsGroups`,
    initialState: {},
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(createGroup, (state,{ payload }) => {

        return {...state, [payload.name]: {name: payload.name, color: payload.color}}
      })
    }
})

export default slice;