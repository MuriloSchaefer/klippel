import { ACTION_TYPES } from "@kernel/constants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import type {
  AddMaterialInput,
  CatalogDelta,
  CatalogSnapshot,
  StockDTO,
  UpdateMaterialInput,
} from "../../typings/catalog";
import type { MaterialState, MaterialsState } from "./state";

// Commands ------------------------------------------------------------

export const loadMaterials = createAction<{ }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Load materials`
);

/** Read the workspace's `MaterialCatalogCoMap` via the Jazz IPC surface. */
export const loadMaterialsCatalog = createAction(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Load materials catalog`
);

/**
 * Ask main what changed since this renderer last asked. This is the response to
 * a catalog tick; `loadMaterialsCatalog` stays for the cases where there is no
 * meaningful "since" — cold open, workspace switch, refresh-from-peers.
 */
export const loadMaterialsCatalogDelta = createAction(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Load materials catalog delta`
);

export const addMaterial = createAction<AddMaterialInput>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Add material`
);

export const updateMaterial = createAction<UpdateMaterialInput>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Update material`
);

export const updateMaterialStock = createAction<{ id: string; stock: StockDTO }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Update material stock`
);

export const deleteMaterial = createAction<{ id: string }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Delete material`
);

export const registerMaterialTypeVersion = createAction<{
    name: string;
    version: string;
    schemaJson: string;
    predecessorId?: string;
}>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Register material type version`
);

// Events --------------------------------------------------------------

export const materialsLoaded = createAction<MaterialsState>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Materials loaded`
);

/** Full snapshot from the workspace's Jazz catalog. */
export const materialsCatalogLoaded = createAction<CatalogSnapshot>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Materials catalog loaded`
);

/** Only the catalog rows that moved since the last tick. */
export const materialsCatalogDeltaLoaded = createAction<CatalogDelta>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Materials catalog delta loaded`
);

export const materialAdded = createAction<MaterialState>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Material added`
);

export const materialUpdated = createAction<{ id: string; material: MaterialState }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Material updated`
);

export const materialStockUpdated = createAction<{ id: string; stock: StockDTO }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Material stock updated`
);

export const materialDeleted = createAction<{ id: string }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Material deleted`
);

export const materialTypeVersionRegistered = createAction<{
    id: string;
    name: string;
    version: string;
    schemaJson: string;
}>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Material type version registered`
);
