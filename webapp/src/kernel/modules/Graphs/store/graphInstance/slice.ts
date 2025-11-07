import { createSlice, Store } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  graphsManagerInitialState,
  newGraphState,
  GraphsManagerState,
  GraphState,
  AdjacencyList,
} from "../state";
import {
  addEdge,
  addNode,
  invalidateSearch,
  loadGraph,
  removeEdge,
  removeNode,
  resetGraph,
  searchFinished,
  updateNode,
} from "./actions";
import { saveSession } from "../graphsManager/actions";

const storage = window.electron.storage;

export const sessionSaver = (store: Store<GraphsManagerState>) => () => {
  store.dispatch(saveSession());
};

export async function persistState(state: GraphState) {
  await storage.writeBlob(
    `.session/Graph/graphs/${state.id}.json`,
    new Blob([JSON.stringify({ ...state, searchResults: {} })]),
    { encoding: "utf-8" }
  );
  return state;
}

const slice = createSlice({
  name: MODULE_NAME,
  initialState: graphsManagerInitialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      loadGraph,
      (state: GraphsManagerState, { payload: { graphId, graph } }) => {
        return { ...state, graphs: { ...state.graphs, [graphId]: graph } };
      }
    );
    builder
      .addCase(
        addNode,
        (state: GraphsManagerState, { payload: { graphId, node, edges } }) => {
          const graph = state.graphs[graphId];
          if (!graph) throw Error("Graph does not exist");
          const nodeState = graph.nodes[node.id];
          if (nodeState) throw Error("Node already exists");

          let otherNodesChanges: AdjacencyList = Object.entries(edges.inputs).reduce(
            (acc, [id, edge]) => ({
              ...acc,
              [edge.sourceId]: {
                ...graph.adjacencyList[edge.sourceId],
                outputs: [...graph.adjacencyList[edge.sourceId].outputs, id],
              },
            }),
            {}
          );
          otherNodesChanges = Object.entries(edges.outputs).reduce(
            (acc, [id, edge]) => ({
              ...acc,
              [edge.targetId]: {
                ...otherNodesChanges[edge.targetId],
                inputs: [...otherNodesChanges[edge.targetId].inputs, id],
              },
            }),
            otherNodesChanges
          );

          const newGraphState = {
            ...graph,
            nodes: {
              ...graph.nodes,
              [node.id]: node,
            },
            edges: {
              ...graph.edges,
              ...Object.entries(edges.inputs).reduce(
                (acc, [id, edge]) => ({ ...acc, [id]: edge }),
                {}
              ),
              ...Object.entries(edges.outputs).reduce(
                (acc, [id, edge]) => ({ ...acc, [id]: edge }),
                {}
              ),
            },
            adjacencyList: {
              ...graph.adjacencyList,
              [node.id]: {
                inputs: Object.keys(edges.inputs),
                outputs: Object.keys(edges.outputs),
              },
              ...otherNodesChanges,
            },
          };

          return {
            ...state,
            graphs: {
              ...state.graphs,
              [graphId]: newGraphState,
            },
          };
        }
      )
      .addCase(
        removeNode,
        (state: GraphsManagerState, { payload: { graphId, nodeId } }) => {
          const edgesToRemove = Object.entries(state.graphs[graphId].edges)
            .filter(
              ([_, edge]) =>
                edge.sourceId === nodeId || edge.targetId === nodeId
            )
            .map(([k, _]) => k);
          const newGraphState = {
            ...state.graphs[graphId],
            nodes: Object.values(state.graphs[graphId].nodes).reduce(
              (acc, curr) =>
                curr.id !== nodeId ? { ...acc, [curr.id]: curr } : acc,
              {}
            ),
            adjacencyList: Object.entries(
              state.graphs[graphId].adjacencyList
            ).reduce(
              (acc, [id, curr]) =>
                id !== nodeId
                  ? {
                      ...acc,
                      [id]: {
                        inputs: curr.inputs.filter(
                          (i) => !edgesToRemove.includes(i)
                        ),
                        outputs: curr.outputs.filter(
                          (i) => !edgesToRemove.includes(i)
                        ),
                      },
                    }
                  : acc,
              {}
            ),
            edges: Object.entries(state.graphs[graphId].edges).reduce(
              (acc, [id, curr]) =>
                !edgesToRemove.includes(id) ? { ...acc, [id]: curr } : acc,
              {}
            ),
          };

          return {
            ...state,
            graphs: {
              ...state.graphs,
              [graphId]: newGraphState,
            },
          };
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
          const graph = state.graphs[graphId]
          const edge = graph.edges[edgeId];

          const newGraphState = {
            ...state.graphs[graphId],
            adjacencyList: Object.entries(
              state.graphs[graphId].adjacencyList
            ).reduce(
              (acc, [id, curr]) =>
                id === edge.sourceId || id === edge.targetId
                  ? {
                      ...acc,
                      [id]: {
                        inputs: curr.inputs.filter((i) => i !== edgeId),
                        outputs: curr.outputs.filter((i) => i !== edgeId),
                      },
                    }
                  : { ...acc, [id]: curr },
              {}
            ),
            edges: Object.entries(state.graphs[graphId].edges).reduce(
              (acc, [id, curr]) =>
                id !== edgeId ? { ...acc, [id]: curr } : acc,
              {}
            ),
          };

          return {
            ...state,
            graphs: {
              ...state.graphs,
              [graphId]: newGraphState,
            },
          };
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
      )
      .addCase(
        searchFinished,
        (
          state: GraphsManagerState,
          { payload: { graphId, searchId, results } }
        ) => {
          const newGraphState = {
            ...state.graphs[graphId],
            id: graphId,
            searchResults: {
              ...state.graphs[graphId].searchResults,
              [searchId]: results,
            },
          };
          return {
            ...state,
            graphs: {
              ...state.graphs,
              [graphId]: newGraphState,
            },
          };
        }
      )
      .addCase(
        invalidateSearch,
        (state, { payload: { graphId, searchId } }) => {
          const newGraphState = {
            ...state.graphs[graphId],
            searchResults: {
              ...state.graphs[graphId].searchResults,
              [searchId]: {
                ...state.graphs[graphId].searchResults[searchId],
                outdated: true,
              },
            },
          };
          return {
            ...state,
            graphs: {
              ...state.graphs,
              [graphId]: newGraphState,
            },
          };
        }
      );
  },
});

export default slice;
