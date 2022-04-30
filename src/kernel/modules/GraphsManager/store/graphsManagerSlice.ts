import { createSlice, PayloadAction } from "@reduxjs/toolkit";
// eslint-disable-next-line import/no-cycle
import { RootState } from "@kernel/store";

import {
  graphsManagerInitialState,
  newGraphState,
  GraphsManagerState,
} from "./state";
import graphReducer from "./graphSlice";

export const graphsManagerSlice = createSlice({
  name: "graphs",
  initialState: graphsManagerInitialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    newGraph: (state: GraphsManagerState, action: PayloadAction<string>) => {
      const graph = state.graphs[action.payload];
      if (graph) return;

      state.graphs[action.payload] = newGraphState;
    },
    removeGraph: (state: GraphsManagerState, action: PayloadAction<string>) => {
      const graph = state.graphs[action.payload];
      if (!graph) throw Error("Graph does not exist");

      delete state.graphs[action.payload];
    },
    ...graphReducer,
  },
});

export const {
  newGraph,
  removeGraph,
  addNode,
  removeNode,
  updateNode,
  addEdge,
  removeEdge,
} = graphsManagerSlice.actions;

// The function below is called a selector and allows us to select a value from
// the state. Selectors can also be defined inline where they're used instead of
// in the slice file. For example: `useSelector((state: RootState) => state.counter.value)`
export const selectGraph = (state: RootState, graphId: string) =>
  graphId in state.graphsManager.graphs
    ? state.graphsManager.graphs[graphId]
    : null;

export default graphsManagerSlice.reducer;
