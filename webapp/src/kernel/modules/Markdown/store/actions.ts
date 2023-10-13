import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { MarkdownState } from "./state";


// COMMANDS
export const loadMarkdown = createAction<{ path: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Load Markdown`
);

export const fetchMarkdown = createAction<{ path: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Fetch Markdown`
);



// EVENTS
export const markdownFetched = createAction<Pick<MarkdownState, 'path'|"content">>(
    `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] Markdown fetched`
  );
  export const markdownLoaded = createAction<MarkdownState>(
    `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] Markdown loaded`
  );