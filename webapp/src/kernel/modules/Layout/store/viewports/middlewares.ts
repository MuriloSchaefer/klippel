import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { LayoutState } from "../state";
import {
  selectViewport,
  closeViewport,
  viewportSelected,
  viewportClosed,
  addViewport,
  viewportAdded,
  addToGroup,
  addedToGroup,
  removeFromGroup,
  setExtrasViewport,
  ExtrasViewportSet,
} from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: addViewport,
  effect: async ({ payload: { name } }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Layout: {
        viewportManager: { viewports },
      },
    } = getState() as { Layout: LayoutState };
    dispatch(viewportAdded(viewports[name])); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: selectViewport,
  effect: async ({ payload: { name } }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Layout: {
        viewportManager: { viewports },
      },
    } = getState() as { Layout: LayoutState };
    dispatch(viewportSelected(viewports[name])); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: closeViewport,
  effect: async ({ payload: { name } }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(viewportClosed({ name })); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: setExtrasViewport,
  effect: async (action, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(ExtrasViewportSet); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: addToGroup,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(addedToGroup(payload)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: removeFromGroup,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(removeFromGroup(payload)); // dispatch event
  },
});

export default middlewares;
