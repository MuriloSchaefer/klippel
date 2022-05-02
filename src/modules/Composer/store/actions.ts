import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";

export const parseParts = createAction<{
  graphId: string;
  svgRoot: SVGElement;
}>(`[${MODULE_NAME}] Parse Parts`);
export const parseMannequin = createAction<{
  graphId: string;
  svgRoot: SVGElement;
}>(`[${MODULE_NAME}] Parse Mannequin`);
export const parseAnnotations = createAction(
  `[${MODULE_NAME}] Parse Annotations`
);
