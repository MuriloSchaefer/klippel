import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import { Proxy, RestrictionNode } from "./state";

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
export const addToBudget = createAction<{compositionName: string, budgetId: string, gradesInfo: string[]}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Add to budget`
);


export const addProxy = createAction<{compositionName:string, materialId:string, proxy: Proxy}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Add Proxy`
);
export const deleteProxy = createAction<{compositionName:string, materialId:string, proxyId:string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Delete Proxy`
);
export const updateProxy = createAction<any>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Update Proxy`
);

export const addRestriction = createAction<{compositionName:string, materialId:string, restriction: RestrictionNode}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Add Restriction`
);
export const deleteRestriction = createAction<{compositionName:string, materialId:string, restrictionId:string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Delete Restriction`
);
export const updateRestriction = createAction<{compositionName:string, materialId:string, restrictionId:string, changes: Partial<RestrictionNode>}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Update Restriction`
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
export const materialChanged = createAction<{compositionName: string, materialUsageId: string, materialId: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Material changed`
);

export const proxyAdded = createAction<any>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Proxy added`
)
export const proxyDeleted = createAction<any>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Proxy deleted`
)
export const proxyUpdated = createAction<any>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Proxy updated`
)

export const restrictionAdded = createAction<{compositionName:string, materialId:string, restrictionId:string}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Restriction added`
)
export const restrictionDeleted = createAction<{compositionName:string, materialId:string, restrictionId:string}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Restriction deleted`
)
export const restrictionUpdated = createAction<{compositionName:string, materialId:string, restrictionId:string}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Restriction updated`
)

export const debugViewportOpened = createAction<{compositionName: string, viewportName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Debug viewport opened`
);
export const debugViewportClosed = createAction<{compositionName: string, viewportName: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Debug viewport closed`
);
export const addedToBudget = createAction<{compositionName: string, budgetId: string}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Added to budget`
)