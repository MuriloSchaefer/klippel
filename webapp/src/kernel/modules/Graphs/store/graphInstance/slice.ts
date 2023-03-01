import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import Edge from "../../interfaces/Edge";
import {
  graphsManagerInitialState,
  GraphsManagerState,
  newGraphState,
} from "../state";
import {
  addEdge,
  addNode,
  loadGraph,
  removeEdge,
  removeNode,
  resetGraph,
  updateNode,
} from "./actions";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: graphsManagerInitialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(
        loadGraph,
        (state: GraphsManagerState, { payload: { graphId, graph } }) => {
          return {...state, graphs: {...state.graphs, [graphId]: graph}};
        }
      )
    builder
      .addCase(
        addNode,
        (state: GraphsManagerState, { payload: { graphId, node, edges } }) => {
          const graph = state.graphs[graphId];
          if (!graph) throw Error("Graph does not exist");
          const nodeState = graph.nodes[node.id];
          if (nodeState) throw Error("Node already exists");

          graph.nodes[node.id] = node;

          Object.entries(edges.inputs).forEach(
            ([sourceId, edge]: [string, Edge]) => {
              const sourceNode = graph.nodes[sourceId];
              if (!sourceNode) throw Error("Source node does not exist");


              graph.adjacencyList[sourceId] = {
                inputs: graph.adjacencyList[sourceId]?.inputs ?? [],
                outputs: [
                  ...(graph.adjacencyList[sourceId]?.outputs ?? []),
                  edge.id,
                ],
              };
              graph.adjacencyList[node.id] = {
                outputs: graph.adjacencyList[node.id]?.outputs ?? [],
                inputs: [
                  ...(graph.adjacencyList[node.id]?.inputs ?? []),
                  edge.id,
                ],
              };

              graph.edges[edge.id] = edge;
            }
          );

          Object.entries(edges.outputs).forEach(
            ([targetId, edge]: [string, Edge]) => {
              const targetNode = graph.nodes[targetId];
              if (!targetNode) throw Error("Source node does not exist");

              graph.adjacencyList[targetId] = {
                ...graph.adjacencyList[targetId],
                inputs: [
                  ...(graph.adjacencyList[targetId]?.inputs ?? []),
                  node.id,
                ],
              };
              graph.adjacencyList[node.id] = {
                ...graph.adjacencyList[node.id],
                outputs: [
                  ...(graph.adjacencyList[node.id]?.outputs ?? []),
                  targetId,
                ],
              };
            }
          );

          return state;
        }
      )
      .addCase(
        removeNode,
        (state: GraphsManagerState, { payload: { graphId, nodeId } }) => {
          const graph = state.graphs[graphId];
          if (!graph) throw Error("Graph does not exist");
          const nodeState = graph.nodes[nodeId];
          if (!nodeState) throw Error("Node does not exist");

          delete graph.nodes[nodeId];
          delete graph.adjacencyList[nodeId];

          Object.values(graph.edges).forEach((edge) => {
            if (edge.sourceId === nodeId) {
              delete graph.edges[edge.id];
              graph.adjacencyList[edge.targetId].inputs = graph.adjacencyList[
                edge.targetId
              ].inputs.filter((c) => c !== edge.id);
            }
            if (edge.targetId === nodeId) {
              delete graph.edges[edge.id];
              graph.adjacencyList[edge.sourceId].outputs = graph.adjacencyList[
                edge.sourceId
              ].outputs.filter((c) => c !== edge.id);
            }
          });

          return state;
        }
      )

      .addCase(
        updateNode,
        (
          state: GraphsManagerState,
          { payload: { graphId, nodeId, changes } }
        ) => {
          const graph = state.graphs[graphId];
          const node = graph.nodes[nodeId];
          if (node === null) throw Error("Node does not exist");

          graph.nodes[nodeId] = { ...node, ...changes };

          return state;
        }
      )

      .addCase(
        addEdge,
        (state: GraphsManagerState, { payload: { graphId, edge } }) => {
          const graph = state.graphs[graphId];
          const edge_exists = graph.edges[edge.id];
          if (edge_exists) throw Error("Edge already exists");

          graph.edges[edge.id] = edge;
          graph.adjacencyList[edge.sourceId].outputs.push(edge.id);
          graph.adjacencyList[edge.targetId].inputs.push(edge.id);

          return state;
        }
      )
      .addCase(
        removeEdge,
        (state: GraphsManagerState, { payload: { graphId, edgeId } }) => {
          const graph = state.graphs[graphId];
          const edge = graph.edges[edgeId];
          if (!edge) throw Error("Edge does not exist");

          delete graph.edges[edgeId];
          graph.adjacencyList[edge.sourceId].outputs = graph.adjacencyList[
            edge.sourceId
          ].outputs.filter((id) => id !== edge.id);
          graph.adjacencyList[edge.targetId].inputs = graph.adjacencyList[
            edge.targetId
          ].inputs.filter((id) => id !== edge.id);

          return state;
        }
      )
      .addCase(
        resetGraph,
        (state: GraphsManagerState, { payload: { graphId } }) => {
          return {
            ...state,
            graphs: {
              ...state.graphs,
              [graphId]: { id: graphId, ...newGraphState },
            },
          };
        }
      );
  },
});

export default slice;
