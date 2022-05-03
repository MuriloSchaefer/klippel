import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { MannequinChangeEvent } from "../interfaces/events/MannequinChange";

// EVENTS
export const startSVGLoad = createAction<{
  product: string;
  model: string;
}>(`[${MODULE_NAME}] SVG Load Started`);
export const SVGLoaded = createAction<{
  graphId: string;
  svgRoot: SVGElement;
}>(`[${MODULE_NAME}] SVG Loaded`);

// UI EVENTS

export const mannequinChangeEvent = createAction<MannequinChangeEvent>(
  `[${MODULE_NAME}] Mannequin attributes changed`
);

// COMMANDS
export const parseSVG = createAction<{
  svgRoot: SVGElement;
}>(`[${MODULE_NAME}] Parse SVG`);
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
