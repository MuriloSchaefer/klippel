import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";

// commands
export const addMaterial = createAction<{compositionName: string, materialId: number}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Add material`
);

export const addMaterialType = createAction<{compositionName: string, materialType: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Add material type`
);
export const changeMaterial = createAction<{compositionName: string, materialUsageId: string, materialId: number}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Change material`
);

export const selectPart = createAction<{compositionName: string, partName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Select part`
);
export const unselectPart = createAction<{compositionName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Unselect part`
);

export const materialChanged = createAction<{compositionName: string, materialUsageId: string, materialId: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Material changed`
);

export const openDebugView = createAction<{compositionName: string, debugViewport: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Open debug viewport`
);
export const closeDebugView = createAction<{compositionName: string, debugViewport: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Create debug viewport`
);


// events

export const materialAdded = createAction<{compositionName: string, materialId: number, nodeId: string}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Material added`
)

export const materialTypeAdded = createAction<{compositionName: string, materialType: string, nodeId: string}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Material type added`
)

export const partSelected = createAction<{compositionName: string, partName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Part selected`
);
export const partUnselected = createAction<{compositionName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Part unselected`
);

export const debugViewportOpened = createAction<{compositionName: string, viewportName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Debug viewport opened`
);
export const debugViewportClosed = createAction<{compositionName: string, viewportName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Debug viewport closed`
);