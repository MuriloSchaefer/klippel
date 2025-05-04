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

const storage = window.electron.storage;
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
const restoreThemeSession = async (sessionPath: PathLike = ".session/Layout") => {
  const exists = await storage.exists(`${sessionPath}/state.json`);
  if (!exists) return layoutInitialState
  const fileContent = await storage.readFile<string>(`${sessionPath}/theme.json`, {encoding: 'utf-8'});
  return JSON.parse(fileContent) as {theme: PaletteMode};
}

const slice = createSlice({
    name: MODULE_NAME,
    initialState: {
      ...layoutInitialState,
      ...await restoreThemeSession(),
      panels: panelsSlice.getInitialState(),
      viewportManager: viewportManagerSlice.getInitialState(),
    },
    reducers: {},
    extraReducers: (builder) => {
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