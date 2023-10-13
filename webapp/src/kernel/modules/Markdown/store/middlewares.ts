import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  markdownFetched,
  markdownLoaded,
  fetchMarkdown,
  loadMarkdown,
} from "./actions";
import { MarkdownModuleState } from "./state";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: loadMarkdown,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(fetchMarkdown({ path: payload.path })); // dispatch event

    // logic to load the SVG file
    const response = await fetch(payload.path);
    const raw = await (await response.blob()).text();

    dispatch(markdownFetched({ path: payload.path, content: raw })); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: markdownFetched,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Markdown: { markdowns },
    } = getState() as { Markdown: MarkdownModuleState };

    dispatch(markdownLoaded(markdowns[payload.path])); // dispatch event
  },
});

export default middlewares;
