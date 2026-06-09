import { ACTION_TYPES } from "@kernel/constants";
import { createAction } from "@reduxjs/toolkit";
import { CSSProperties } from "react";
import { MODULE_NAME } from "../constants";
import { SVGState, Proxies, InjectedElement } from "./state";

// Commands
export const saveSession = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save session`
);

export const loadSVG = createAction<{ path: string; instanceName: string; content?: string }>(
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

export const addInjectedElement = createAction<{
  path: string;
  instanceName: string;
  element: InjectedElement;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Add injected element`);
export const updateInjectedElement = createAction<{
  path: string;
  instanceName: string;
  id: string;
  changes: Partial<InjectedElement>;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Update injected element`);
export const deleteInjectedElement = createAction<{
  path: string;
  instanceName: string;
  id: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Delete injected element`);

export const updateSVG = createAction<{
  path: string;
  instanceName: string;
  document: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Update SVG`);

export const removeInstance = createAction<{
  path: string;
  instanceName: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Remove instance`);


// Events
export const sessionSaved = createAction(
  `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] session saved`
);
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

export const injectedElementAdded = createAction<{
  path: string;
  instanceName: string;
  element: InjectedElement;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] Injected element added`);
export const injectedElementUpdated = createAction<{
  path: string;
  instanceName: string;
  id: string;
  changes: Partial<InjectedElement>;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] Injected element updated`);
export const injectedElementDeleted = createAction<{
  path: string;
  instanceName: string;
  id: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] Injected element deleted`);

export const SVGUpdated = createAction<{
  path: string;
  instanceName: string;
  document: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] SVG Updated`);

export const InstanceRemoved = createAction<{
  path: string;
  instanceName: string;
}>(`[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] SVG Instance removed`);
