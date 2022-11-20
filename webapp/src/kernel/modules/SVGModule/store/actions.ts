import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";

export const startSVGLoad = createAction<{
  path: string;
}>(`[${MODULE_NAME}] SVG Load Started`);
export const storeSVG = createAction<{
  path: string,
  raw: string
}>(`[${MODULE_NAME}:Store] Store SVG to redux state`);

export const SVGLoaded = createAction<{
  path: string;
}>(`[${MODULE_NAME}] SVG Loaded`);

export const parseSVG = createAction<{path: string}>(
  `[${MODULE_NAME}:UI] Parse SVG to ReactNode`
);
