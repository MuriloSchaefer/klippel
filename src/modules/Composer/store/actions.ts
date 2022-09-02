import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { MannequinChangedEvent } from "../interfaces/events/MannequinChanged";
import { PartPropertiesChangedEvent } from "../interfaces/events/PartPropertiesChanged";
import { PartSelectedEvent } from "../interfaces/events/PartSelected";

// EVENTS
export const startSVGLoad = createAction<{
  product: string;
  model: string;
}>(`[${MODULE_NAME}] SVG Load Started`);
export const SVGLoaded = createAction<{
  graphId: string;
  svgRoot: SVGElement;
}>(`[${MODULE_NAME}] SVG Loaded`);

export const garmentParseFinished = createAction<{
  graphId: string;
  svgRoot: SVGElement;
}>(`[${MODULE_NAME}] Garment Parse Finished`);

// UI EVENTS
export const mannequinChangedEvent = createAction<MannequinChangedEvent>(
  `[${MODULE_NAME}] Mannequin properties changed`
);
export const partSelectedEvent = createAction<PartSelectedEvent>(
  `[${MODULE_NAME}] Part selected`
);
export const partUnSelectedEvent = createAction(
  `[${MODULE_NAME}] Part unselected`
);
export const partPropertiesChanged = createAction<PartPropertiesChangedEvent>(
  `[${MODULE_NAME}] Part properties changed`
);

// COMMANDS
export const parseSVG = createAction<{
  svgRoot: SVGElement;
}>(`[${MODULE_NAME}] Parse SVG`);
export const parseGarment = createAction<{
  graphId: string;
  svgRoot: SVGElement;
}>(`[${MODULE_NAME}] Parse Garment`);
export const parseMannequin = createAction<{
  graphId: string;
  svgRoot: SVGElement;
}>(`[${MODULE_NAME}] Parse Mannequin`);
export const parseAnnotations = createAction(
  `[${MODULE_NAME}] Parse Annotations`
);
