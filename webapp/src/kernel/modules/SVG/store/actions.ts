import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { CSSProperties } from "react";
import { MODULE_NAME } from "../constants";
import { SVGState, Proxies } from "./state";

// Commands
export const loadSVG = createAction<{ path: string; instanceName: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Load SVG`
);

export const fetchSVG = createAction<{ path: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Fetch SVG`
);

export const setPan = createAction<{
  path: string;
  instanceName: string;
  x: number;
  y: number;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Set pan`);

export const setZoom = createAction<{
  path: string;
  instanceName: string;
  zoom: number;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Set zoom`);

export const addProxy = createAction<{
  path: string;
  instanceName: string;
  id: string;
  styles: CSSProperties;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Add proxy`);
export const updateProxy = createAction<{
  path: string;
  instanceName: string;
  id: string;
  changes: CSSProperties;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Update proxy`);
export const deleteProxy = createAction<{
  path: string;
  instanceName: string;
  id: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Delete proxy`);

export const updateSVG = createAction<{
  path: string;
  instanceName: string;
  document: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Update SVG`);

// Events
export const SVGFetched = createAction<{ path: string; content: string }>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] SVG fetched`
);
export const SVGLoaded = createAction<SVGState>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] SVG loaded`
);
export const proxyAdded = createAction<{
  path: string;
  instanceName: string;
  id: string;
  styles: CSSProperties;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Proxy added`);

export const proxyUpdated = createAction<Proxies>(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Proxy updated`
);
export const proxyDeleted = createAction<{
  path: string;
  instanceName: string;
  id: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Proxy deleted`);

export const SVGUpdated = createAction<{
  path: string;
  instanceName: string;
  document: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] SVG Updated`);
