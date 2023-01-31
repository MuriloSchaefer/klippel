import { PaletteMode } from "@mui/material";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { expandSettings, settingsExpanded, openDetails, detailsOpened, collapseSettings, settingsCollapsed, closeDetails, detailsClosed } from "./actions";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: expandSettings,
  effect: async (_action, listenerApi) => {
    const { dispatch} = listenerApi;
    dispatch(settingsExpanded()) // dispatch event
  },
});
middlewares.startListening({
    actionCreator: collapseSettings,
    effect: async (_action, listenerApi) => {
      const { dispatch} = listenerApi;
      dispatch(settingsCollapsed()) // dispatch event
    },
  });

middlewares.startListening({
    actionCreator: closeDetails,
    effect: async (_action, listenerApi) => {
      const { dispatch} = listenerApi;
      dispatch(detailsClosed()) // dispatch event
    },
  });

export default middlewares;