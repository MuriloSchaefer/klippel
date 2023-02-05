import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { CompositionState } from "./state";


// Commands
export const createComposition = createAction<{name: string, viewportName: string, svgPath: string, graphId: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Create composition`
);
export const parseSVG = createAction<{compositionName: string, svgContent: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Parse SVG`
);


// Events
export const compositionCreated = createAction<CompositionState>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Composition created`
);
export const SVGParsed = createAction<CompositionState>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] SVGParsed`
);
