import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import Edge from "../../interfaces/Edge";

import Node from "../../interfaces/Node";

import { addNode, nodeAdded, removeNode, nodeRemoved, updateNode, nodeUpdated, addEdge, edgeAdded, removeEdge, edgeRemoved } from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: addNode,
  effect: async ({payload: {graphId, node}}: PayloadAction<{ graphId: string; node: Node }>, listenerApi) => {
    const { dispatch} = listenerApi;
    dispatch(nodeAdded({graphId, node})) // dispatch event
  },
});
middlewares.startListening({
  actionCreator: removeNode,
  effect: async ({payload: {graphId, nodeId}}: PayloadAction<{ graphId: string; nodeId: string }>, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(nodeRemoved({graphId, nodeId})) // dispatch event
  },
});

middlewares.startListening({
  actionCreator: updateNode,
  effect: async ({payload: action}: PayloadAction<{ graphId: string; nodeId: string, changes: Partial<Node> }>, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(nodeUpdated(action)) // dispatch event
  },
});

middlewares.startListening({
  actionCreator: addEdge,
  effect: async ({payload: action}: PayloadAction<{ graphId: string; edge: Edge}>, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(edgeAdded(action)) // dispatch event
  },
});
middlewares.startListening({
  actionCreator: removeEdge,
  effect: async ({payload: action}: PayloadAction<{ graphId: string; edgeId: string}>, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(edgeRemoved(action)) // dispatch event
  },
});


export default middlewares;