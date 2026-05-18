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
  removeInstance,
  InstanceRemoved,
} from "./actions";
import { SVGModuleState } from "./state";
import { persistState } from "./slice";
import { sanitizeSvg } from "../utils/sanitizeSvg";

const middlewares = createListenerMiddleware();
const storage = globalThis.electron.storage

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (payload, listenerApi) => {
      const { dispatch, getState } = listenerApi;

      const {SVG: state} = getState() as { SVG: SVGModuleState }
      await Promise.all(Object.values(state.svgs).map(persistState))

      dispatch(sessionSaved());
  }
})

middlewares.startListening({
  actionCreator: loadSVG,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    if (payload.content) {
      dispatch(SVGFetched({ path: payload.path, content: sanitizeSvg(payload.content) }));
      return;
    }

    dispatch(fetchSVG({ path: payload.path }));
    const raw = await storage.readFile<string>(payload.path, {encoding: 'utf-8'})
    dispatch(SVGFetched({ path: payload.path, content: sanitizeSvg(raw) }));
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

    dispatch(SVGLoaded(svgs[payload.path])); 
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
    ); 
  },
});

middlewares.startListening({
  actionCreator: deleteProxy,
  effect: async ({ payload }, { dispatch }) => {
    dispatch(proxyDeleted(payload)); 
  },
});

middlewares.startListening({
  actionCreator: updateSVG,
  effect: async ({ payload }, { dispatch }) => {
    dispatch(SVGUpdated(payload)); 
  },
});

middlewares.startListening({
  actionCreator: removeInstance,
  effect: async ({ payload }, { dispatch }) => {
    dispatch(InstanceRemoved(payload)); 
  },
});
export default middlewares;
