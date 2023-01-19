import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import Edge from "../../interfaces/Edge";
import Node from "../../interfaces/Node";


// Events
export const nodeAdded = createAction<{ graphId: string; node: Node }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Node added`
);
export const nodeRemoved = createAction<{ graphId: string; nodeId: string }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Node removed`
);
export const nodeUpdated = createAction<{ graphId: string; nodeId: string, changes: Partial<Node> }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Node updated`
);

export const edgeAdded = createAction<{ graphId: string; edge: Edge }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Edge added`
);
export const edgeRemoved = createAction<{ graphId: string; edgeId: string }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.EVENT}] Edge removed`
);

// Commands
export const resetGraph = createAction<{ graphId: string }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Reset Graph`
);
export const addNode = createAction<{ graphId: string; node: Node }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Add node`
);
export const removeNode = createAction<{ graphId: string; nodeId: string }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Remove node`
);
export const updateNode = createAction<{ graphId: string; nodeId: string, changes: Partial<Node> }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Update node`
);

export const addEdge = createAction<{ graphId: string; edge: Edge}>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Add edge`
);
export const removeEdge = createAction<{ graphId: string; edgeId: string }>(
    `[${MODULE_NAME}:Instance:${ACTION_TYPES.COMMAND}] Remove edge`
);