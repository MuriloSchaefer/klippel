import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import initialModuleState, { initialMarkdownState } from "./state";
import {
  fetchMarkdown,
  loadMarkdown,
  markdownFetched,
  markdownLoaded,
} from "./actions";

export default createSlice({
  name: MODULE_NAME,
  initialState: initialModuleState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadMarkdown, (state, { payload: { path } }) => {
      return {
        ...state,
        markdowns: {
          ...state.markdowns,
          [path]: {
            ...initialMarkdownState,
            path,
          },
        },
      };
    });
    builder.addCase(fetchMarkdown, (state, { payload: { path } }) => {
      return {
        ...state,
        markdowns: {
          ...state.markdowns,
          [path]: {
            ...state.markdowns[path],
            progress: "started",
          },
        },
      };
    });
    builder.addCase(
      markdownFetched,
      (state, { payload: { path, content } }) => {
        return {
          ...state,
          markdowns: {
            ...state.markdowns,
            [path]: {
              ...state.markdowns[path],
              content,
            },
          },
        };
      }
    );
    builder.addCase(markdownLoaded, (state, { payload: { path } }) => {
      return {
        ...state,
        markdowns: {
          ...state.markdowns,
          [path]: {
            ...state.markdowns[path],
            progress: "completed",
          },
        },
      };
    });
  },
});
