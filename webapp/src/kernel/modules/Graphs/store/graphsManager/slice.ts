import { createSlice } from "@reduxjs/toolkit";
import {
  graphsManagerInitialState,
  newGraphState,
  GraphsManagerState,
} from "../state";
import { createGraph, destroyGraph } from "./actions";


const slice = createSlice({
    name: "StoreModule",
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
    }
})

export default slice;