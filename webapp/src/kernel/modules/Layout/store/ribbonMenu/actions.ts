import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import { RibbonTabState } from "./state";

// Commands
export const addRibbonTab = createAction<{tab: RibbonTabState}>(
    `[${MODULE_NAME}:Ribbon:${ACTION_TYPES.COMMAND}] Add tab`
);
export const selectTab = createAction<{name: string}>(
    `[${MODULE_NAME}:Ribbon:${ACTION_TYPES.COMMAND}] Select tab`
);



// Events
export const ribbonTabAdded = createAction<{tab: RibbonTabState}>(
    `[${MODULE_NAME}:Ribbon:${ACTION_TYPES.EVENT}] tab added`
);
export const tabSelected = createAction<{tab: RibbonTabState}>(
    `[${MODULE_NAME}:Ribbon:${ACTION_TYPES.EVENT}] tab selected`
);