import React from "react";
import { PostBootInitializationProps, StartModuleProps } from "@kernel/modules/base";

import { MODULE_NAME } from "./constants";
import slice from "./store/slice";

import EstoqueSection from "./components/EstoqueSection";
import TiposDeMateriaisSection from "./components/TiposDeMateriaisSection";
import MaterialStockViewport from "./components/viewports/MaterialStockViewport";

import materialsMiddlewares from "./store/materials/middlewares";

import { loadMaterialsCatalog } from "./store/materials/actions";

export function startModule({
  dispatch,
  managers: { storeManager, componentRegistryManager, ribbonMenuManager },
}: StartModuleProps) {
  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);
  storeManager.functions.registerMiddleware(materialsMiddlewares);

  // Catalog load is driven by `workspaceSelected` (see
  // `store/materials/middlewares.ts`). Dispatching at module-start
  // time races the kernel's workspace-selection bootstrap and reliably
  // fires the IPC before main has an active workspace, producing a
  // "No active workspace" rejection — workspaceSelected fires the same
  // `loadMaterialsCatalog` once the Jazz node is open.

  // Live catalog refresh — main process subscribes to the active
  // `MaterialCatalogCoMap` and pushes a `jazz-materials:changed` IPC
  // event on every mutation (local or remote-via-sync). We translate
  // each tick into a `loadMaterialsCatalog` dispatch so the table
  // reflects edits made on another peer without requiring a workspace
  // switch. Subscription survives workspace changes — main re-attaches
  // its Jazz subscription on the new catalog via `requireCatalog`.
  globalThis.electron?.jazz?.materials?.onChanged?.(() => {
    dispatch(loadMaterialsCatalog());
  });

  componentRegistryManager.functions.registerComponents({
    ribbonMenuSections: {
      Estoque: React.memo(EstoqueSection),
      TiposDeMateriais: React.memo(TiposDeMateriaisSection),
    },
    viewportTypes: {
      MaterialStock: MaterialStockViewport,
    },
  });
  ribbonMenuManager.functions.addNewTab({
    label: "Materiais",
    sectionNames: ["Estoque", "TiposDeMateriais"],
    type: "base",
  });
}

export function postBootInitialization({
  managers: { keyboardManager },
}: PostBootInitializationProps) {
  // Ribbon-tab shortcuts. Each is paired with a visible
  // `ShortcutHint` on its IconButton (per repo `CLAUDE.md`). The
  // `{ context: 'RibbonMenu' }` scope mirrors Composer's pattern at
  // `Composer/kernelCalls.ts:89-105` — these only fire while the
  // ribbon menu has focus.
  keyboardManager.functions.registerShortcuts(
    [
      {
        id: `${MODULE_NAME}/Estoque/addMaterial`,
        key: "q",
        contextId: `${MODULE_NAME}/Estoque`,
        action: () => document.getElementById("open-add-material")?.click(),
        description: "Novo material",
        enabled: true,
      },
      {
        id: `${MODULE_NAME}/Estoque/openStock`,
        key: "w",
        contextId: `${MODULE_NAME}/Estoque`,
        action: () => document.getElementById("open-material-stock")?.click(),
        description: "Abrir estoque",
        enabled: true,
      },
      {
        id: `${MODULE_NAME}/Estoque/importCatalog`,
        key: "a",
        contextId: `${MODULE_NAME}/Estoque`,
        action: () => document.getElementById("open-import-catalog")?.click(),
        description: "Importar catálogo",
        enabled: true,
      },
      {
        id: `${MODULE_NAME}/TiposDeMateriais/addType`,
        key: "e",
        contextId: `${MODULE_NAME}/TiposDeMateriais`,
        action: () =>
          document.getElementById("open-add-material-type")?.click(),
        description: "Novo tipo de material",
        enabled: true,
      },
      {
        id: `${MODULE_NAME}/TiposDeMateriais/updateType`,
        key: "r",
        contextId: `${MODULE_NAME}/TiposDeMateriais`,
        action: () =>
          document.getElementById("open-update-material-type")?.click(),
        description: "Editar tipo de material",
        enabled: true,
      },
    ],
    { context: "RibbonMenu" },
  );

  // Viewport-scoped shortcuts. Each is paired with a visible
  // `ShortcutHint` on its control (per repo `CLAUDE.md`).
  keyboardManager.functions.registerShortcuts([
    {
      id: `${MODULE_NAME}/MaterialStockViewport/viewAsTable`,
      key: "1",
      contextId: `${MODULE_NAME}/MaterialStockViewport`,
      action: () =>
        document.getElementById("material-stock-view-table")?.click(),
      description: "View stock as table",
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialStockViewport/viewAsQuadtree`,
      key: "2",
      contextId: `${MODULE_NAME}/MaterialStockViewport`,
      action: () =>
        document.getElementById("material-stock-view-quadtree")?.click(),
      description: "View stock as quadtree",
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialStockViewport/focusSearch`,
      key: "/",
      contextId: `${MODULE_NAME}/MaterialStockViewport`,
      action: () => {
        const input = document.querySelector<HTMLInputElement>(
          '[data-testid="material-stock-search"] input',
        );
        input?.focus();
        input?.select?.();
      },
      description: "Focus material search",
      enabled: true,
    },
    {
      // `e`/`d` act on the currently-selected grid row: they click that
      // row's trailing-column trigger, reusing the per-row
      // `PointerContainer` (Update form / delete confirmation) rather
      // than duplicating dispatch logic. Hints live on the selected
      // row's icons (see `UpdateMaterialButton` / `DeleteMaterialButton`).
      id: `${MODULE_NAME}/MaterialStockViewport/editSelected`,
      key: "e",
      contextId: `${MODULE_NAME}/MaterialStockViewport`,
      action: () =>
        document
          .querySelector(".MuiDataGrid-row.Mui-selected")
          ?.querySelector<HTMLElement>('[data-testid^="material-row-update-"]')
          ?.click(),
      description: "Editar material selecionado",
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialStockViewport/deleteSelected`,
      key: "d",
      contextId: `${MODULE_NAME}/MaterialStockViewport`,
      action: () =>
        document
          .querySelector(".MuiDataGrid-row.Mui-selected")
          ?.querySelector<HTMLElement>('[data-testid^="material-row-delete-"]')
          ?.click(),
      description: "Excluir material selecionado",
      enabled: true,
    },
  ]);
}
