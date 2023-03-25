import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { CSSProperties } from "react";
import { MODULE_NAME } from "../constants";
import { SVGState, Proxies } from "./state";

// Commands
export const loadSVG = createAction<{ path: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Load SVG`
);

export const fetchSVG = createAction<{ path: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Fetch SVG`
);
export const addProxy = createAction<{
  path: string;
  proxySet: string;
  id: string;
  styles: CSSProperties;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Add proxy`);
export const updateProxy = createAction<{
  path: string;
  proxySet: string;
  id: string;
  changes: CSSProperties;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Update proxy`);

// Events
export const SVGFetched = createAction<{ path: string; content: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] SVG fetched`
);
export const SVGLoaded = createAction<SVGState>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] SVG loaded`
);
export const proxyAdded = createAction<{
  path: string;
  proxySet: string;
  id: string;
  styles: CSSProperties;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Proxy added`);

export const proxyUpdated = createAction<Proxies>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Proxy updated`);
