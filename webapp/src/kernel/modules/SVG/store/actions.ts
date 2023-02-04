import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { SVGState } from "./state";

// Commands
export const loadSVG = createAction<{path: string }>(
    `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Load SVG`
);

export const fetchSVG = createAction<{path: string }>(
    `[${MODULE_NAME}:SVG:${ACTION_TYPES.COMMAND}] Fetch SVG`
);


// Events
export const SVGFetched = createAction<{path: string, content: string }>(
    `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] SVG fetched`
);
export const SVGLoaded = createAction<SVGState>(
    `[${MODULE_NAME}:SVG:${ACTION_TYPES.EVENT}] SVG loaded`
);


