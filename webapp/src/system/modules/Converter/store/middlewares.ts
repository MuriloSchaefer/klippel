import { createListenerMiddleware } from "@reduxjs/toolkit";
import { conversionGraphLoaded, loadConversionGraph, nodeSelected, saveSession, selectNode, sessionSaved } from "./actions";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { createGraph } from "@kernel/modules/Graphs/store/graphsManager/actions";

import initialGraph from "../assets/conversion-graph";
import { loadGraph } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { ConverterState } from "./state";
import { persistConverter } from "./slice";
import { workspaceSelected } from "@kernel/modules/Store/actions";

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

// Workspace switch fans out via `workspaceSelected` (dispatched
// by `Store/middlewares.ts` after `runAllRehydrators`). The Converter
// module's conversion graph is fixture-driven — re-fire the loader
// so the new workspace's Redux state contains the same graph the
// boot path sets up. Without this, a freshly-selected workspace
// (whose `.session/Graph/...` rehydrate returned no entry for
// `CONVERSION_GRAPH_NAME`) ends up with no conversion graph at all
// until the user saves + reloads.
middlewares.startListening({
  actionCreator: workspaceSelected,
  effect: async (_action, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(loadConversionGraph());
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