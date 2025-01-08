import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  graphsManagerInitialState,
  newGraphState,
  GraphsManagerState,
} from "../state";
import { createGraph, destroyGraph } from "./actions";

import instanceSlice from "../graphInstance/slice"

const storage = window.electron.storage;
storage.createDir(".session/Graph/graphs");

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
          const f = storage.open(`.session/Graph/graphs/${graphId}.js`, 'w+');
          storage.write(f.fd, JSON.stringify(state.graphs[graphId]), {encoding:'utf-8'})
          storage.close(f.fd)
          return state
        }
      )
      .addCase(
        destroyGraph, 
        (state: GraphsManagerState, { payload: { graphId } }) => {
          if (!(graphId in state.graphs)) throw Error()

          delete state.graphs[graphId]
          storage.deleteFile(`.session/Graph/graphs/${graphId}.js`)
          return state
        }
      )
      builder.addDefaultCase(instanceSlice.reducer)
    }
})

export default slice;