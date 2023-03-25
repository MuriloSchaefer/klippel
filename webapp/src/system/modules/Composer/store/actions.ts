import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { CompositionState } from "./composition/state";


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
export const fetchModel = createAction<{compositionName: string, modelPath: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Fetch model `
);
export const storeModel = createAction<{compositionName: string, model: any}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Store model`
);
export const loadProxies = createAction<{compositionName: string, model: any}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Load proxies`
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

export const modelFetched = createAction<{compositionName: string, model: any}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Model fetched`
)
export const proxiesLoaded = createAction<{compositionName: string, model: any}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Proxies loaded`
)
export const modelStored = createAction<{compositionName: string, model: any}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Model stored`
)