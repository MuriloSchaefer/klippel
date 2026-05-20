import { createSlice, Store } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { saveSession, switchTheme } from "./actions";
import viewportManagerSlice from "./viewports/slice";
import ribbonMenuSlice from "./ribbonMenu/slice";
import panelsSlice from "./panels/slice";
import {
  LayoutState, layoutInitialState
} from "./state";
import { PathLike } from "fs";
import type { PaletteMode } from "@mui/material";

import { defineRehydration, workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
storage.ensureDir(".session/Layout");

export const sessionSaver = (store: Store<LayoutState>) => () => {
  store.dispatch(saveSession())
};

export function persistTheme(state: {theme: PaletteMode}) {
  storage.writeBlob(".session/Layout/theme.json", new Blob([JSON.stringify(state)]), {
    encoding: "utf-8",
  });
  return state
}
/**
 * Restore only the persisted theme. Earlier this returned the full
 * `LayoutState` and the rehydrator replaced the whole slice on every
 * workspace switch — clobbering runtime-registered ribbon tabs and
 * already-rehydrated nested slices (`panels`, `viewportManager`). Now the
 * rehydrator is scoped to the one field this module persists; nested
 * slices keep their own rehydration, and ribbon tabs survive the switch.
 */
const restoreThemeSession = async (
  sessionPath: PathLike = ".session/Layout",
): Promise<{ theme: PaletteMode }> => {
  const exists = await storage.exists(`${sessionPath}/theme.json`);
  if (!exists) return { theme: layoutInitialState.theme };
  const fileContent = await storage.readFile<string>(`${sessionPath}/theme.json`, {
    encoding: "utf-8",
  });
  return JSON.parse(fileContent) as { theme: PaletteMode };
};

const buildLayoutInitial = async (): Promise<LayoutState> => ({
  ...layoutInitialState,
  ...(await restoreThemeSession()),
  panels: panelsSlice.getInitialState(),
  viewportManager: viewportManagerSlice.getInitialState(),
});

export const layoutRehydrated = defineRehydration<{ theme: PaletteMode }>(
  `${MODULE_NAME}/rehydrated`,
  restoreThemeSession,
);

const slice = createSlice({
    name: MODULE_NAME,
    initialState: await buildLayoutInitial(),
    reducers: {},
    extraReducers: (builder) => {
      // Patch only the theme — preserve panels, viewportManager (own
      // rehydrators), and ribbonMenu (runtime-registered tabs).
      builder.addCase(layoutRehydrated, (state, { payload }) => ({
        ...state,
        theme: payload.theme,
      }));
      builder.addCase(
        switchTheme,
        (state: LayoutState, { payload: { theme } }) => {
          return {
            ...state,
            ...persistTheme({theme})
          };
        }
      )
        
      builder.addDefaultCase((state, action)=>({
        ...state, 
        panels: panelsSlice.reducer(state.panels, action),
        ribbonMenu: ribbonMenuSlice.reducer(state.ribbonMenu, action),
        viewportManager: viewportManagerSlice.reducer(state.viewportManager, action)
      }))
    }
})

export default slice;