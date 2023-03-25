import { createListenerMiddleware } from "@reduxjs/toolkit";
import { LayoutState } from "../state";
import {
  expandSettings,
  settingsExpanded,
  openDetails,
  detailsOpened,
  collapseSettings,
  settingsCollapsed,
  closeDetails,
  detailsClosed,
} from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: expandSettings,
  effect: async (_action, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(settingsExpanded()); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: collapseSettings,
  effect: async (_action, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(settingsCollapsed()); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: openDetails,
  effect: async (_action, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(detailsOpened()); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: closeDetails,
  effect: async (_action, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Layout: {
        viewportManager: { activeViewport },
      },
    } = getState() as { Layout: LayoutState };
    
    dispatch(detailsClosed({ viewportName: activeViewport })); // dispatch event
  },
});

export default middlewares;
