import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { CSSProperties } from "react";
import {
  deleteProxy,
  fetchSVG,
  loadSVG,
  proxyDeleted,
  proxyUpdated,
  SVGFetched,
  SVGLoaded,
  SVGUpdated,
  updateSVG,
  updateProxy,
  saveSession,
  sessionSaved,
} from "./actions";
import { SVGModuleState } from "./state";
import { persistState } from "./slice";

const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (payload, listenerApi) => {
      const { dispatch, getState } = listenerApi;
      
      const {SVG: state} = getState() as { SVG: SVGModuleState }
      Object.values(state.svgs).forEach(persistState)

      dispatch(sessionSaved()); // dispatch event
  }
})

middlewares.startListening({
  actionCreator: loadSVG,
  effect: async ({ payload }: PayloadAction<{ path: string }>, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(fetchSVG({ path: payload.path })); // dispatch event

    // logic to load the SVG file
    const response = await fetch(payload.path);
    const raw = await (await response.blob()).text();

    dispatch(SVGFetched({ path: payload.path, content: raw })); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: SVGFetched,
  effect: async (
    { payload }: PayloadAction<{ path: string; content: string }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      SVG: { svgs },
    } = getState() as { SVG: SVGModuleState };

    dispatch(SVGLoaded(svgs[payload.path])); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: updateProxy,
  effect: async (
    {
      payload,
    }: PayloadAction<{
      path: string;
      instanceName: string;
      id: string;
      changes: CSSProperties;
    }>,
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;
    const {
      SVG: { svgs },
    } = getState() as { SVG: SVGModuleState };

    dispatch(
      proxyUpdated(svgs[payload.path].instances[payload.instanceName].proxies)
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: deleteProxy,
  effect: async ({ payload }, { dispatch }) => {
    dispatch(proxyDeleted(payload)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: updateSVG,
  effect: async ({ payload }, { dispatch }) => {
    dispatch(SVGUpdated(payload)); // dispatch event
  },
});

export default middlewares;
