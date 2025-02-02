import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import initialModuleState, { initialMarkdownState, MarkdownModuleState } from "./state";
import {
  fetchMarkdown,
  loadMarkdown,
  markdownFetched,
  markdownLoaded,
} from "./actions";

const storage = window.electron.storage;
storage.createDir(".session/Markdown");
function persistState(state: MarkdownModuleState){
  storage.write(".session/Markdown/state.js", JSON.stringify(state), {
    encoding: "utf-8",
  });
  return state
}

export default createSlice({
  name: MODULE_NAME,
  initialState: initialModuleState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadMarkdown, (state, { payload: { path } }) => {
      return persistState({
        ...state,
        markdowns: {
          ...state.markdowns,
          [path]: {
            ...initialMarkdownState,
            path,
          },
        },
      });
    });
    builder.addCase(fetchMarkdown, (state, { payload: { path } }) => {
      return persistState({
        ...state,
        markdowns: {
          ...state.markdowns,
          [path]: {
            ...state.markdowns[path],
            progress: "started",
          },
        },
      });
    });
    builder.addCase(
      markdownFetched,
      (state, { payload: { path, content } }) => {
        return persistState({
          ...state,
          markdowns: {
            ...state.markdowns,
            [path]: {
              ...state.markdowns[path],
              content,
            },
          },
        });
      }
    );
    builder.addCase(markdownLoaded, (state, { payload: { path } }) => {
      return persistState({
        ...state,
        markdowns: {
          ...state.markdowns,
          [path]: {
            ...state.markdowns[path],
            progress: "completed",
          },
        },
      });
    });
  },
});
