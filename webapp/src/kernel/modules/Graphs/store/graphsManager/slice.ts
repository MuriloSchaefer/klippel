import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  graphsManagerInitialState,
  newGraphState,
  GraphsManagerState,
} from "../state";
import { createGraph, destroyGraph } from "./actions";

import instanceSlice from "../graphInstance/slice"


const slice = createSlice({
    name: MODULE_NAME,
    initialState: graphsManagerInitialState,
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        createGraph, 
        (state: GraphsManagerState, { payload: { graphId } }) => {
          if (graphId in state.graphs) throw Error()

          state.graphs[graphId] = { ...newGraphState, id: graphId }
          return state
        }
      )
      .addCase(
        destroyGraph, 
        (state: GraphsManagerState, { payload: { graphId } }) => {
          if (!(graphId in state.graphs)) throw Error()

          delete state.graphs[graphId]
          return state
        }
      )
      builder.addDefaultCase(instanceSlice.reducer)
    }
})

export default slice;