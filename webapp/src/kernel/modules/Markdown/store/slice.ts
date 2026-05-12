import { createSlice, type Store } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import initialModuleState, { initialMarkdownState, MarkdownModuleState } from "./state";
import {
  fetchMarkdown,
  loadMarkdown,
  markdownFetched,
  markdownLoaded,
  saveSession,
} from "./actions";

import { workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
storage.ensureDir(".session/Markdown");

export const sessionSaver = (store: Store<MarkdownModuleState>) => () => {
  store.dispatch(saveSession());
};

export function persistState(state: MarkdownModuleState){
  storage.writeBlob(".session/Markdown/state.json", new Blob([JSON.stringify(state)]), {
    encoding: "utf-8",
  });
  return state
}

export default createSlice({
  name: MODULE_NAME,
  initialState: initialModuleState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadMarkdown, (state, { payload: { path } }) => ({
      ...state,
      markdowns: {
        ...state.markdowns,
        [path]: {
          ...initialMarkdownState,
          path,
        },
      },
    }));
    builder.addCase(fetchMarkdown, (state, { payload: { path } }) => ({
      ...state,
      markdowns: {
        ...state.markdowns,
        [path]: {
          ...state.markdowns[path],
          progress: "started",
        },
      },
    }));
    builder.addCase(
      markdownFetched,
      (state, { payload: { path, content } }) => ({
        ...state,
        markdowns: {
          ...state.markdowns,
          [path]: {
            ...state.markdowns[path],
            content,
          },
        },
      })
    );
    builder.addCase(markdownLoaded, (state, { payload: { path } }) => ({
      ...state,
      markdowns: {
        ...state.markdowns,
        [path]: {
          ...state.markdowns[path],
          progress: "completed",
        },
      },
    }));
  },
});
