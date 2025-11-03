import { createListenerMiddleware } from "@reduxjs/toolkit";
import {
  markdownFetched,
  markdownLoaded,
  fetchMarkdown,
  loadMarkdown,
  saveSession,
  sessionSaved,
} from "./actions";
import { MarkdownModuleState } from "./state";
import { persistState } from "./slice";

const storage = globalThis.electron.storage
const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: saveSession,
  effect: async (_, listenerApi) => {
      const { dispatch, getState } = listenerApi;
      
      const {Markdown: state} = getState() as { Markdown: MarkdownModuleState }
      persistState(state)

      dispatch(sessionSaved()); 
  }
})

middlewares.startListening({
  actionCreator: loadMarkdown,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(fetchMarkdown({ path: payload.path })); 

    const raw = await storage.readFile<string>(payload.path, {encoding: 'utf-8'})

    dispatch(markdownFetched({ path: payload.path, content: raw })); 
  },
});

middlewares.startListening({
  actionCreator: markdownFetched,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Markdown: { markdowns },
    } = getState() as { Markdown: MarkdownModuleState };

    dispatch(markdownLoaded(markdowns[payload.path])); 
  },
});

export default middlewares;
