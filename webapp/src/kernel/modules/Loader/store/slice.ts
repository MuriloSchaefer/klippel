import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { moduleStarted } from "./actions";

import { loaderInitialState, LoaderState } from "./state";


const slice = createSlice({
    name: MODULE_NAME,
    initialState: loaderInitialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(moduleStarted, (state: LoaderState) => {
            state.modulesCount += 1

            return state
        })
    //   builder.addCase(
    //     createGraph, 
    //     (state: GraphsManagerState, { payload: { graphId } }) => {
    //       if (graphId in state.graphs) throw Error()

    //       state.graphs[graphId] = { ...newGraphState, id: graphId }
    //       return state
    //     }
    //   )
    //   .addCase(
    //     destroyGraph, 
    //     (state: GraphsManagerState, { payload: { graphId } }) => {
    //       if (!(graphId in state.graphs)) throw Error()

    //       delete state.graphs[graphId]
    //       return state
    //     }
    //   )
    }
})

export default slice;