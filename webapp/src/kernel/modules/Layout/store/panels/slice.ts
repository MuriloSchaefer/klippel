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

const storage = globalThis.electron.storage;
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
  const detailsExists = await storage.exists(`${sessionPath}/details.json`);
  const detailsContent = !detailsExists
    ? initialState.details
    : JSON.parse(
        await storage.readFile<string>(`${sessionPath}/details.json`, {
          encoding: "utf-8",
        })
      );

  const settingsExists = await storage.exists(`${sessionPath}/settings.json`);
  const settingsContent = !settingsExists
    ? initialState.settings
    : JSON.parse(
        await storage.readFile<string>(`${sessionPath}/settings.json`, {
          encoding: "utf-8",
        })
      );
  return { details: detailsContent, settings: settingsContent } as PanelsState;
};

const slice = createSlice({
  name: MODULE_NAME,
  initialState: await restorePanelsSession(),
  reducers: {},
  extraReducers: (builder) => {
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
