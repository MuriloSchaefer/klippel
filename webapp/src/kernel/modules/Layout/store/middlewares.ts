import type { PaletteMode } from "@mui/material";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { saveSession, sessionSaved, switchTheme, themeSwitched } from "./actions";
import { LayoutState } from "./state";
import { persistTheme } from "./slice";
import { persistActiveVP, persistViewportState } from "./viewports/slice";
import { persistVPGroupState } from "./viewports/groups/slice";
import { persistPanelsState } from "./panels/slice";
import { persistRibbonMenuState } from "./ribbonMenu/slice";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: saveSession,
  effect: async (payload, listenerApi) => {
      const { dispatch, getState } = listenerApi;
      
      const {Layout: state} = getState() as { Layout: LayoutState }
      persistTheme({theme: state.theme})

      Object.values(state.viewportManager.viewports).filter(vp => vp.name != 'home').forEach(persistViewportState)
      persistActiveVP(state.viewportManager.activeViewport)
      Object.values(state.viewportManager.groups).forEach(persistVPGroupState)

      persistPanelsState(state.panels)
      persistRibbonMenuState(state.ribbonMenu)


      dispatch(sessionSaved()); // dispatch event
  }
})
middlewares.startListening({
  actionCreator: switchTheme,
  effect: async ({payload}: PayloadAction<{ theme: PaletteMode }>, listenerApi) => {
    const { dispatch} = listenerApi;
    localStorage.setItem('theme', payload.theme)
    dispatch(themeSwitched(payload)) // dispatch event
  },
});

export default middlewares;