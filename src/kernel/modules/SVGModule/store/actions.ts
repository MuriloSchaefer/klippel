import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";


export const storeSVG = createAction<{
  id: string,
  raw: string
}>(`[${MODULE_NAME}:Store] Store SVG to redux state`);

export const parseSVG = createAction<{id: string}>(
  `[${MODULE_NAME}:UI] Parse SVG to ReactNode`
);
