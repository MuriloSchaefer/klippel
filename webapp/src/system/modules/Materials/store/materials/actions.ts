import { ACTION_TYPES } from "@kernel/constants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import type {
  AddMaterialInput,
  CatalogDelta,
  CatalogSnapshot,
  CatalogWindow,
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

/**
 * Load the first page of the catalog — the materials open models reference
 * plus the most-used page — replacing whatever the slice held.
 *
 * This is the cold-open / workspace-switch load. It supersedes
 * `loadMaterialsCatalog`, which mirrored every material into Redux for a grid
 * that virtualizes ~30 rows (docs/analysis/materials-catalog-lag-analysis.md,
 * "Still open").
 */
export const loadMaterialsWindow = createAction<{ pinnedIds?: string[] } | undefined>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Load materials window`
);

/**
 * Extend the current view by one page — the scroll path. Applies to whichever
 * view is active: the ranked browse list, or the current search's results.
 */
export const loadMoreMaterials = createAction(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Load more materials`
);

/**
 * Run a query against the **whole** catalog in the main process.
 *
 * Search cannot be a renderer-side filter any more: the renderer holds a page,
 * so filtering locally would only ever search what happened to be resident and
 * silently miss the rest of the catalog.
 */
export const searchMaterialsCatalog = createAction<{ query: string }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Search materials catalog`
);

/**
 * Ensure these specific materials are in the slice, loading any that are not.
 *
 * The lazy path for a graph node that references a material outside the
 * window — opening a model must not depend on that model's materials having
 * ranked into the first page.
 */
export const ensureMaterialsLoaded = createAction<{ ids: string[] }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Ensure materials loaded`
);

/**
 * Re-read the span of the catalog the user has already paged to.
 *
 * The answer to "the catalog grew or shrank underneath me": rows added or
 * removed outside the window are invisible in a scoped delta, so the view has
 * to be re-asked. Bounded by how far the user scrolled, not by catalog size.
 */
export const refreshMaterialsView = createAction(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Refresh materials view`
);

/**
 * Load the materials of one type into the mirror.
 *
 * The material pickers' path. A picker offers "every material of type X"; the
 * resident page is not that set, so without this it would silently offer a
 * subset of the catalog and blank any current value that fell outside it.
 * Bounded by type cardinality, which is a fraction of catalog size.
 */
export const loadMaterialsOfType = createAction<{ type: string }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.COMMAND}] Load materials of type`
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

/**
 * One page of the catalog arrived.
 *
 * Unlike `materialsCatalogLoaded` this **merges** unless `payload.reset` is
 * set: a page is an addition to what the renderer mirrors, not a replacement
 * for it — replacing would drop the rows an open model pinned the moment the
 * user scrolled.
 */
export const materialsWindowLoaded = createAction<CatalogWindow>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Materials window loaded`
);

/**
 * These materials must stay resident — an open model references them.
 *
 * Separate from the load that may follow, because pinning applies to rows
 * that are *already* resident too: without the pin, the next `reset` read
 * would evict a material the open model is rendering.
 */
export const materialsPinned = createAction<{ ids: string[] }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Materials pinned`
);

/** A window request is in flight — drives the grid's loading affordance. */
export const materialsWindowRequested = createAction<{ reason: "page" | "search" | "ids" }>(
    `[${MODULE_NAME}:Materials:${ACTION_TYPES.EVENT}] Materials window requested`
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
