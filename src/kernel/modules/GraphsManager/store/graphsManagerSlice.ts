import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
// eslint-disable-next-line import/no-cycle

import { RootState } from "@kernel/store";
import {
  graphsManagerInitialState,
  newGraphState,
  GraphsManagerState,
  GraphState,
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
export const selectGraphById = createSelector(
  [
    (state: RootState) => state.graphsManager.graphs,
    (
      _graphs: {
        [graphId: string]: GraphState;
      },
      graphId: string
    ) => graphId,
  ],
  (graphs, graphId) => (graphId in graphs ? graphs[graphId] : null)
);

export default graphsManagerSlice.reducer;
