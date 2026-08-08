import type { PaletteMode } from "@mui/material";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { saveSession, sessionSaved, switchTheme, themeSwitched } from "./actions";
import { LayoutState } from "./state";
import { persistTheme } from "./slice";
import { persistActiveVP, persistDirtyViewports, persistViewportState } from "./viewports/slice";
import { persistVPGroupState, pruneVPGroupFiles } from "./viewports/groups/slice";
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
      persistDirtyViewports(state.viewportManager.dirtyViewports)
      // Write every live group, then drop the files of groups that no longer
      // exist. The save is the *only* thing that touches `.session/`, so it has
      // to reconcile: without the prune, a group deleted since the last save
      // would come back on the next rehydrate.
      Object.values(state.viewportManager.groups).forEach(persistVPGroupState)
      await pruneVPGroupFiles(Object.keys(state.viewportManager.groups))

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