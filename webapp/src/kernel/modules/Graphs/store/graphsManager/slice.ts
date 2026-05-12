import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  graphsManagerInitialState,
  newGraphState,
  GraphsManagerState,
  GraphState,
} from "../state";
import { createGraph, destroyGraph } from "./actions";

import instanceSlice from "../graphInstance/slice"
import { PathLike } from "fs";

import { forWorkspace, getCurrentWorkspace } from "@kernel/modules/Store/workspaceScope";
const storage = forWorkspace(await getCurrentWorkspace());
storage.ensureDir(".session/Graph/graphs");

const restoreSession = async (sessionPath: PathLike = ".session/Graph/graphs") => {
  const files = await storage.searchDir<string[]>(sessionPath, ['**/*.json'], { });
  const graphs = await files.reduce(async (acc, file) => {
    if (!["modules.json", "conversion-graph.json"].includes(file)) {
      const fileContent = await storage.readFile<string>(`${sessionPath}/${file}`, {encoding: 'utf-8'});
      const content = JSON.parse(fileContent) as GraphState;
      return {...await acc, [content.id]: content};
    }
    return acc
  }, {})
  return {graphs};
}

const slice = createSlice({
    name: MODULE_NAME,
    initialState: {...graphsManagerInitialState, ...await restoreSession()},
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        createGraph, 
        (state: GraphsManagerState, { payload: { graphId } }) => {
          if (graphId in state.graphs) throw Error()

          state.graphs[graphId] = { ...newGraphState, id: graphId }
          storage.writeBlob(`.session/Graph/graphs/${graphId}.json`, new Blob([JSON.stringify(state.graphs[graphId])]), {encoding:'utf-8'})
          return state
        }
      )
      .addCase(
        destroyGraph, 
        (state: GraphsManagerState, { payload: { graphId } }) => {
          if (!(graphId in state.graphs)) throw Error()

          delete state.graphs[graphId]
          storage.deleteFile(`.session/Graph/graphs/${graphId}.json`)
          return state
        }
      )
      builder.addDefaultCase(instanceSlice.reducer)
    }
})

export default slice;