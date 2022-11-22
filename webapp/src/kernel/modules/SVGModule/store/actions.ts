import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { ACTION_TYPES } from "@kernel/contants";
import { ISVGProxy } from "../interfaces";


// EVENTS
export const SVGLoaded = createAction<{
  path: string;
  DOMId: string;
}>(`[${MODULE_NAME}:${ACTION_TYPES.EVENT}] SVG Loaded`);

export const SVGInjected = createAction<{path: string, DOMId: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}:UI] SVG Injected to DOM`
);

// COMMANDS
export const loadSVG = createAction<{
  path: string;
}>(`[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Load SVG`);

export const parseSVG = createAction<{path: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Parse SVG to ReactNode`
);
export const syncProxy = createAction<{path: string, proxy: ISVGProxy}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Sync Proxy to SVG Element`
);

// DOCUMENTS
export const storeSVG = createAction<{
  path: string,
  raw: string
}>(`[${MODULE_NAME}:${ACTION_TYPES.DOCUMENT}] Store SVG to redux state`);

export const createProxy = createAction<{path: string, proxy: ISVGProxy}>(
  `[${MODULE_NAME}:${ACTION_TYPES.DOCUMENT}] Create SVG Proxy`
);
export const updateProxy = createAction<{path: string, proxy: ISVGProxy}>(
  `[${MODULE_NAME}:${ACTION_TYPES.DOCUMENT}] Update SVG Proxy`
);





