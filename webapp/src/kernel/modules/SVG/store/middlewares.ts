import { PaletteMode } from "@mui/material";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import {
  fetchSVG,
  loadSVG,
  SVGFetched,
  SVGLoaded,
} from "./actions";
import { SVGModuleState } from "./state";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadSVG,
  effect: async ({ payload }: PayloadAction<{ path: string }>, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(fetchSVG({ path: payload.path })); // dispatch event

    // logic to load the SVG file
    const response = await fetch(payload.path);
    const raw = await (await response.blob()).text();
    console.log(raw);

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


export default middlewares;
