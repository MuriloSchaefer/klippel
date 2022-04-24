import { createSlice, PayloadAction } from "@reduxjs/toolkit";
// eslint-disable-next-line import/no-cycle
import { RootState } from "@kernel/store";

import Node from "../interfaces/Node";
import Edge from "../interfaces/Edge";

export interface GraphState {
  nodes: { [id: string]: Node };
  edges: { [id: string]: Edge };
  adjacencyList: { [id: string]: { inputs: string[]; outputs: string[] } };
}

const initialState: GraphState = {
  nodes: {},
  edges: {},
  adjacencyList: {},
};

export const graphSlice = createSlice({
  name: "graph",
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    addNode: (state, action: PayloadAction<Node>) => {
      const node = state.nodes[action.payload.id];
      if (node) throw Error("Node already exists");

      state.nodes[action.payload.id] = action.payload;
      state.adjacencyList[action.payload.id] = { inputs: [], outputs: [] };
    },
    removeNode: (state, action: PayloadAction<string>) => {
      const node = state.nodes[action.payload];
      if (node === null) throw Error("Node does not exist");

      delete state.nodes[action.payload];
      delete state.adjacencyList[action.payload];
      Object.values(state.edges).forEach((edge) => {
        if (edge.sourceId === action.payload) {
          delete state.edges[edge.id];
        }
        if (edge.targetId === action.payload) {
          delete state.edges[edge.id];
        }
      });
    },
    addEdge: (state, action: PayloadAction<Edge>) => {
      const exists = state.edges[action.payload.id] !== null;
      if (exists) throw Error("Edge already exists");

      state.edges[action.payload.id] = action.payload;
      state.adjacencyList[action.payload.sourceId].outputs.push(
        action.payload.id
      );
      state.adjacencyList[action.payload.targetId].inputs.push(
        action.payload.id
      );
    },
    removeEdge: (state, action: PayloadAction<string>) => {
      const edge = state.edges[action.payload];
      if (edge === null) throw Error("Edge does not exist");

      delete state.edges[action.payload];
      state.adjacencyList[edge.sourceId].outputs = state.adjacencyList[
        edge.sourceId
      ].outputs.filter((id) => id !== edge.id);
      state.adjacencyList[edge.targetId].inputs = state.adjacencyList[
        edge.targetId
      ].inputs.filter((id) => id !== edge.id);
    },
  },
});

export const { addNode, removeNode, addEdge, removeEdge } = graphSlice.actions;

// The function below is called a selector and allows us to select a value from
// the state. Selectors can also be defined inline where they're used instead of
// in the slice file. For example: `useSelector((state: RootState) => state.counter.value)`
export const selectGraph = (state: RootState) => state.graph;

export default graphSlice.reducer;
