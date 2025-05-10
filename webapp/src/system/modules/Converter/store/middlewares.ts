import { createListenerMiddleware } from "@reduxjs/toolkit";
import { conversionGraphLoaded, loadConversionGraph, nodeSelected, saveSession, selectNode, sessionSaved } from "./actions";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { createGraph } from "@kernel/modules/Graphs/store/graphsManager/actions";

import initialGraph from "../assets/conversion-graph";
import { loadGraph } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { ConverterState } from "./state";
import { persistConverter } from "./slice";

const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (_, listenerApi) => {
      const { dispatch, getState } = listenerApi;
      
      const {Converter: state} = getState() as { Converter: ConverterState }
      persistConverter(state)

      dispatch(sessionSaved()); // dispatch event
  }
})
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