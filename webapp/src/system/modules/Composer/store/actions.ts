import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import Part from "../interfaces";
import { CompositionState } from "./state";


// Commands
export const createComposition = createAction<{name: string, viewportName: string, svgPath: string, graphId: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Create composition`
);
export const parseSVG = createAction<{compositionName: string, svgContent: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Parse SVG`
);
export const extractModel = createAction<{compositionName: string, svgContent: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] extract Model`
);
export const selectPart = createAction<{compositionName: string, partName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Select part`
);
export const unselectPart = createAction<{compositionName: string, partName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Select part`
);


// Events
export const compositionCreated = createAction<CompositionState>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Composition created`
);
export const SVGParsed = createAction<CompositionState>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] SVG parsed`
);
export const modelExtracted = createAction<{compositionName: string, model: any}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Model extracted`
)
export const partSelected = createAction<Part>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Part selected`
);
export const partUnselected = createAction<Part>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Part unselected`
);
