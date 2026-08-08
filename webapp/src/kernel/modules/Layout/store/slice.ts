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
  // Mirror to the renderer's `localStorage` so the preference
  // survives a workspace switch into a workspace that has never
  // persisted a `theme.json`. Read back by `restoreThemeSession`
  // below; also by `kernelCalls/index.ts` on cold boot.
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("theme", state.theme);
    }
  } catch {
    // localStorage can throw under sandboxed test envs; the disk
    // copy above is the durable source of truth.
  }
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
  if (!exists) {
    // No workspace-local preference yet — fall back to the renderer's
    // `localStorage`, which `persistTheme` mirrors on every change.
    // This keeps the theme stable when switching into a fresh
    // workspace; otherwise the user would snap back to
    // `layoutInitialState.theme` every time.
    let stored: PaletteMode | null = null;
    try {
      if (typeof localStorage !== "undefined") {
        stored = localStorage.getItem("theme") as PaletteMode | null;
      }
    } catch {
      stored = null;
    }
    return { theme: stored ?? layoutInitialState.theme };
  }
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
      // Pure: switching the theme changes state only. It used to call
      // `persistTheme` here, writing `.session/Layout/theme.json` from inside a
      // reducer on every toggle — both impure and a session write outside the
      // whole-session save. The `localStorage` mirror it also did is already
      // handled by the `switchTheme` effect in `store/middlewares.ts`, and the
      // session file is written by the `saveSession` sweep.
      builder.addCase(
        switchTheme,
        (state: LayoutState, { payload: { theme } }) => ({ ...state, theme }),
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