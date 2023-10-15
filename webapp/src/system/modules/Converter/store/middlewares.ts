import { createListenerMiddleware } from "@reduxjs/toolkit";
import { loadConversionGraph } from "./actions";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { createGraph } from "@kernel/modules/Graphs/store/graphsManager/actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadConversionGraph,
  effect: async (action, listenerApi) => {
    const { dispatch} = listenerApi;

    // Mock api call
    // const graph: ConversionGraph = {
    //     nodes: {},
    //     adjacencyList: {},
    //     edges: {},
    //     id: CONVERSION_GRAPH_NAME,
    //     searchResults: {}
    // }

    dispatch(createGraph({graphId: CONVERSION_GRAPH_NAME})) // dispatch event
  },
});

export default middlewares;