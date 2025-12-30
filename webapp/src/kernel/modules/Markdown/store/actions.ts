import { ACTION_TYPES } from "@kernel/constants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { MarkdownState } from "./state";


// COMMANDS
export const saveSession = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save session`
);
export const loadMarkdown = createAction<{ path: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Load Markdown`
);

export const fetchMarkdown = createAction<{ path: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Fetch Markdown`
);



// EVENTS
export const sessionSaved = createAction(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] session saved`
);
export const markdownFetched = createAction<Pick<MarkdownState, 'path'|"content">>(
    `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] Markdown fetched`
  );
  export const markdownLoaded = createAction<MarkdownState>(
    `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] Markdown loaded`
  );