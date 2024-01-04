import { createListenerMiddleware } from "@reduxjs/toolkit";
import { conversionGraphLoaded, loadConversionGraph, nodeSelected, selectNode } from "./actions";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { createGraph } from "@kernel/modules/Graphs/store/graphsManager/actions";

import initialGraph from "../assets/conversion-graph";
import { loadGraph } from "@kernel/modules/Graphs/store/graphInstance/actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadConversionGraph,
  effect: async (action, listenerApi) => {
    const { dispatch} = listenerApi;

    dispatch(createGraph({graphId: CONVERSION_GRAPH_NAME})) // dispatch event
    dispatch(loadGraph({graphId: CONVERSION_GRAPH_NAME, graph: initialGraph}))
    dispatch(conversionGraphLoaded())
  },
});

middlewares.startListening({
  actionCreator: selectNode,
  effect: async (action, listenerApi) => {
    const { dispatch} = listenerApi;

    dispatch(nodeSelected(action.payload))
  },
});

export default middlewares;