import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import Edge from "../../interfaces/Edge";

import bfs from "../../searchAlgs/bfs";
import dfs from "../../searchAlgs/dfs";
import { GraphState, SearchResult, GraphsManagerState } from "../state";

import {
  addNode,
  nodeAdded,
  removeNode,
  nodeRemoved,
  updateNode,
  nodeUpdated,
  addEdge,
  edgeAdded,
  removeEdge,
  edgeRemoved,
  loadGraph,
  graphLoaded,
  search,
  searchFinished,
  SearchPayload,
  invalidateSearch,
  searchInvalidated,
} from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadGraph,
  effect: async (
    {
      payload: { graphId, graph },
    }: PayloadAction<{ graphId: string; graph: GraphState }>,
    listenerApi
  ) => {
    const { dispatch } = listenerApi;
    dispatch(graphLoaded({ graphId, graph })); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: addNode,
  effect: async (
    {
      payload: { graphId, node, edges },
    },
    listenerApi
  ) => {
    const { dispatch } = listenerApi;
    dispatch(nodeAdded({ graphId, node, edges })); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: removeNode,
  effect: async (
    {
      payload: { graphId, nodeId },
    },
    listenerApi
  ) => {
    const { dispatch } = listenerApi;

    dispatch(nodeRemoved({ graphId, nodeId })); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: updateNode,
  effect: async (
    {
      payload: action,
    },
    listenerApi
  ) => {
    const { dispatch } = listenerApi;

    dispatch(nodeUpdated(action)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: addEdge,
  effect: async (
    { payload: action }: PayloadAction<{ graphId: string; edge: Edge }>,
    listenerApi
  ) => {
    const { dispatch } = listenerApi;

    dispatch(edgeAdded(action)); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: removeEdge,
  effect: async (
    { payload: action }: PayloadAction<{ graphId: string; edgeId: string }>,
    listenerApi
  ) => {
    const { dispatch } = listenerApi;

    dispatch(edgeRemoved(action)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: search,
  effect: async (
    { payload: action }: PayloadAction<SearchPayload>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;

    
    let {
      Graph: { graphs },
    } = getState() as { Graph: GraphsManagerState };
    let graph = graphs[action.graphId];

    // If already has a result, avoid searching again. 
    // This is usefull to avoid re-searching on multiple renders.
    if (graph.searchResults && action.id in graph.searchResults && !graph.searchResults[action.id].outdated ){
      dispatch(
        searchFinished({
          graphId: action.graphId,
          searchId: action.id,
          results: graph.searchResults[action.id],
        })
      );
      return
    }
      
    let results: Omit<SearchResult, 'outdated'> = {
      findings: [],
      visited: [],
    };
    switch (action.strategy) {
      case "dfs":
        results = {...dfs(
          graph,
          action.nodeStart,
          action.validate,
          action.stopCriteria,
          action.depth
        )};
        break;
      case 'bfs':
        results = bfs(
          graph,
          action.nodeStart,
          action.validate,
          action.stopCriteria,
          action.depth
        );
        break;
    }

    dispatch(
      searchFinished({
        graphId: action.graphId,
        searchId: action.id,
        results: {...results, outdated: false},
      })
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: invalidateSearch,
  effect: async (
    { payload },
    listenerApi
  ) => {
    const { dispatch } = listenerApi;

    dispatch(searchInvalidated(payload)); // dispatch event
  },
});

export default middlewares;
