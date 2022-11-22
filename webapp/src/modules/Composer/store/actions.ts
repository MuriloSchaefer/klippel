import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { PropertiesChangedEvent } from "../interfaces/events/PartPropertiesChanged";
import { MaterialSelectedEvent } from "../interfaces/events/PartSelected";

// EVENTS

export const garmentParseFinished = createAction<{
  viewportId: string;
  svgDOMId: string;
}>(`[${MODULE_NAME}:Event] Garment Parse Finished`);

// UI EVENTS
export const materialSelectedEvent = createAction<MaterialSelectedEvent>(
  `[${MODULE_NAME}:UI] Material selected`
);
export const materialUnSelectedEvent = createAction(
  `[${MODULE_NAME}:UI] Material unselected`
);
export const materialPropertiesChanged = createAction<PropertiesChangedEvent>(
  `[${MODULE_NAME}:UI] Material properties changed`
);

// COMMANDS
export const setSVGPath = createAction<{viewportId:string; svgPath: string}>(`[${MODULE_NAME}:Command] Set SVG Path`)
export const parseGarment = createAction<{
  viewportId: string;
  svgDOMId: string;
}>(`[${MODULE_NAME}:Command] Parse Garment`);