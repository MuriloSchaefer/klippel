import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import Part from "../interfaces";
import { CompositionState } from "./state";


// Commands
export const createComposition = createAction<{name: string, viewportName: string, svgPath: string, graphId: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Create composition`
);
export const closeComposition = createAction<{name: string, graphId: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Close composition`
);
export const parseSVG = createAction<{compositionName: string, svgContent: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Parse SVG`
);
export const selectPart = createAction<{compositionName: string, partName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Select part`
);
export const unselectPart = createAction<{compositionName: string, partName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Select part`
);
export const fetchModel = createAction<{compositionName: string, modelPath: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Fetch model `
);
export const storeModel = createAction<{compositionName: string, model: any}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Store model`
);


// Events
export const compositionCreated = createAction<CompositionState>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Composition created`
);
export const compositionClosed = createAction<{name: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Composition closed`
);
export const SVGParsed = createAction<CompositionState>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] SVG parsed`
);
export const partSelected = createAction<Part>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Part selected`
);
export const partUnselected = createAction<Part>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Part unselected`
);

export const modelFetched = createAction<{compositionName: string, model: any}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Model fetched`
)
export const modelStored = createAction<{compositionName: string, model: any}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Model stored`
)