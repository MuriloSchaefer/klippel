import { PostBootInitializationProps, StartModuleProps } from "@kernel/modules/base";
import React from "react";
import ModelSection from "./components/ModelSection";
import modelsMiddlewares from "./store/models/middlewares";
import variationMiddlewares from "./store/variations/middlewares";
import computationMiddlewares from "./store/computation/middlewares";
import { saveSession } from "./store/models/actions";
import { MODULE_NAME } from "./constants";
import slice from "./store/slice";
import ModelViewport from "./components/viewports/ModelViewport";

export function startModule({
  managers: { storeManager, componentRegistryManager, ribbonMenuManager },
  storage,
}: StartModuleProps) {
  // configure session saver
  const store = storeManager.functions.getStore();
  storage.registerSessionSaveListener(
    store
      ? () => store.dispatch(saveSession())
      : () => console.log("Missing store. skipping session save!")
  );

  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
  storeManager.functions.registerMiddleware(modelsMiddlewares);
  storeManager.functions.registerMiddleware(variationMiddlewares);
  storeManager.functions.registerMiddleware(computationMiddlewares);
  // storeManager.functions.registerMiddleware(graphMiddlewares)

  componentRegistryManager.functions.registerComponents({
    ribbonMenuSections: {
      ModelSelector: React.memo(ModelSection),
    },
      viewportTypes: {
        // Composer: React.memo(Composerviewport),
        // DebuggerViewport: DebuggerViewport
        ModelViewport: ModelViewport
      }
  });
  ribbonMenuManager.functions.addNewTab({
    label: "Compositor",
    sectionNames: ["ModelSelector"],
    type: "base",
  });

  //storeManager.functions.registerMiddleware(middleware)
}


export function postBootInitialization({managers:{keyboardManager}}: PostBootInitializationProps) {
  keyboardManager.functions.registerShortcuts([
    {
      id: `${MODULE_NAME}/ModelSection/createModel`,
      key: 'q',
      contextId: `${MODULE_NAME}/ModelSection`,
      action: () => document.getElementById("new-model-form")?.click(),
      description: 'Create a new model',
      enabled: true,
    },{
      id: `${MODULE_NAME}/ModelSection/openModel`,
      key: 'w',
      contextId: `${MODULE_NAME}/ModelSection`,
      action: () => document.getElementById("open-model-modal")?.click(),
      description: 'Open an existing model',
      enabled: true,
    }
  ], {context: 'RibbonMenu'})

  keyboardManager.functions.registerShortcuts([
    {
      id: `${MODULE_NAME}/ModelViewport/viewAsGraph`,
      key: '1',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => document.getElementById("composer-view-graph")?.click(),
      description: 'View as graph',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ModelViewport/viewAsSVG`,
      key: '2',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => document.getElementById("composer-view-svg")?.click(),
      description: 'View as SVG',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ModelViewport/addMaterial`,
      key: 'a',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => document.getElementById("composer-add-material")?.click(),
      description: 'Add material',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialList/focus`,
      key: 'Ctrl+m',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const accordion = document.querySelector(
          '[role="accordion-Materiais"]'
        ) as HTMLElement | null;
        if (!accordion) return;
        const summary = accordion.querySelector(
          '[aria-controls="accordion-Materiais-content"]'
        ) as HTMLElement | null;
        if (!summary) return;

        const isExpanded = () =>
          summary.getAttribute('aria-expanded') === 'true';
        const wasExpanded = isExpanded();
        const rowFocusedInside = !!document.activeElement?.closest(
          '[role="accordion-Materiais"] [data-testid="material-item"]'
        );

        // Toggle: if already expanded AND a row inside is focused, collapse.
        if (wasExpanded && rowFocusedInside) {
          summary.click();
          return;
        }

        if (!wasExpanded) summary.click();

        const findFirstRow = () =>
          accordion.querySelector(
            '[data-testid="material-item"]'
          ) as HTMLElement | null;

        // Retry focusing until activeElement actually becomes the row (clicks
        // on AccordionSummary, MUI's Collapse transition, and ripple focus
        // handlers can all clobber an early focus() call).
        const start = Date.now();
        const attempt = () => {
          const first = findFirstRow();
          if (first) {
            first.focus();
            if (document.activeElement === first) return;
          } else {
            // Subtree not yet rendered — wait for the transition.
          }
          if (Date.now() - start < 1500) {
            setTimeout(attempt, 50);
          } else if (!findFirstRow()) {
            // List confirmed empty after timeout — fall back to add button.
            document
              .getElementById('composer-add-material')
              ?.focus();
          }
        };
        // First attempt after the click's synchronous focus shifts settle.
        setTimeout(attempt, 0);
      },
      description: 'Toggle / focus material list',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialItem/focusNext`,
      key: 'ArrowDown',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="material-item"]');
        if (!current) return;
        const next = current.nextElementSibling as HTMLElement | null;
        if (next?.matches('[data-testid="material-item"]')) {
          next.focus();
        }
      },
      description: 'Focus next material item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialItem/focusPrev`,
      key: 'ArrowUp',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="material-item"]');
        if (!current) return;
        const prev = current.previousElementSibling as HTMLElement | null;
        if (prev?.matches('[data-testid="material-item"]')) {
          prev.focus();
        }
      },
      description: 'Focus previous material item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialItem/editMaterial`,
      key: 'e',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="material-item"]');
        const btn = row?.querySelector('[data-testid="material-item-edit"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Edit focused material',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialItem/deleteMaterial`,
      key: 'd',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="material-item"]');
        const btn = row?.querySelector('[data-testid="material-item-delete"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Remove focused material',
      enabled: true,
    },
  ])
}