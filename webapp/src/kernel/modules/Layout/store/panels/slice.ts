import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  collapseSettings,
  openDetails,
  expandSettings,
  closeDetails,
} from "./actions";
import { initialState, PanelsState } from "./state";
import { PathLike } from "fs";

import { defineRehydration, workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
import { parseSessionFile } from "../sessionFile";
storage.ensureDir(".session/Layout/panels");

export function persistPanelsState(state: PanelsState) {
  storage.writeBlob(
    ".session/Layout/panels/details.json",
    new Blob([JSON.stringify(state.details)]),
    { encoding: "utf-8" }
  );
  storage.writeBlob(
    ".session/Layout/panels/settings.json",
    new Blob([JSON.stringify(state.settings)]),
    { encoding: "utf-8" }
  );
  return state;
}

const restorePanelsSession = async (
  sessionPath: PathLike = ".session/Layout/panels"
) => {
  const detailsPath = `${sessionPath}/details.json`;
  const detailsExists = await storage.exists(detailsPath);
  const detailsContent = !detailsExists
    ? initialState.details
    : parseSessionFile(
        await storage.readFile<string>(detailsPath, { encoding: "utf-8" }),
        detailsPath,
        initialState.details,
      );

  const settingsPath = `${sessionPath}/settings.json`;
  const settingsExists = await storage.exists(settingsPath);
  const settingsContent = !settingsExists
    ? initialState.settings
    : parseSessionFile(
        await storage.readFile<string>(settingsPath, { encoding: "utf-8" }),
        settingsPath,
        initialState.settings,
      );
  return { details: detailsContent, settings: settingsContent } as PanelsState;
};

export const panelsRehydrated = defineRehydration<PanelsState>(
  `${MODULE_NAME}Panels/rehydrated`,
  restorePanelsSession,
);

const slice = createSlice({
  name: MODULE_NAME,
  initialState: await restorePanelsSession(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(panelsRehydrated, (_state, { payload }) => payload);
    builder.addCase(expandSettings, (state: PanelsState) => ({
      ...state,
      settings: { ...state.settings, state: "expanded" },
    }));
    builder.addCase(collapseSettings, (state: PanelsState) => ({
      ...state,
      settings: { ...state.settings, state: "collapsed" },
    }));

    builder.addCase(openDetails, (state: PanelsState) => ({
      ...state,
      details: { ...state.details, state: "opened" },
    }));
    builder.addCase(closeDetails, (state: PanelsState) => ({
      ...state,
      details: { ...state.details, state: "closed" },
    }));
  },
});

export default slice;
