import { PostBootInitializationProps, StartModuleProps } from "@kernel/modules/base";
import React from "react";
import ModelSection from "./components/ModelSection";
import modelsMiddlewares from "./store/models/middlewares";
import variationMiddlewares from "./store/variations/middlewares";
import computationMiddlewares from "./store/computation/middlewares";
import { saveSession } from "./store/models/actions";
import { selectPart } from "./store/variations/actions";
import {
  MODULE_NAME,
  CONFIRM_MODEL_SELECTION_SHORTCUT_ID,
  MODEL_SELECTION_MODAL_CONTEXT_ID,
  MATERIAL_LIST_CONTEXT_ID,
  GRADUATION_LIST_CONTEXT_ID,
  VISUALIZATION_LIST_CONTEXT_ID,
  ELECTIVE_LIST_CONTEXT_ID,
  PROCESS_LIST_CONTEXT_ID,
  PROCESS_TIME_LIST_CONTEXT_ID,
  SVG_EMPTY_STATE_CONTEXT_ID,
  UPLOAD_SVG_SHORTCUT_ID,
} from "./constants";
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


const getActiveVariationId = (store: any): string | undefined => {
  const state = store.getState?.();
  const vpManager = state?.Layout?.viewportManager;
  if (!vpManager) return undefined;
  const activeName = vpManager.activeViewport;
  return vpManager.viewports?.[activeName]?.extra?.variationId;
};

const ensureGarmentDetailsAccordionExpanded = () => {
  const summary = document.querySelector(
    '[role="accordion-Detalhes da Peça"] [aria-controls="accordion-Detalhes da Peça-content"]',
  ) as HTMLElement | null;
  if (summary && summary.getAttribute('aria-expanded') !== 'true') summary.click();
};

const focusGarmentNameInput = (attempts = 0) => {
  const input = document.getElementById('garment-name') as HTMLInputElement | null;
  if (input) {
    input.focus();
    input.select?.();
    return;
  }
  if (attempts < 30) setTimeout(() => focusGarmentNameInput(attempts + 1), 50);
};

export function postBootInitialization({managers:{keyboardManager, storeManager}}: PostBootInitializationProps) {
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
      id: CONFIRM_MODEL_SELECTION_SHORTCUT_ID,
      key: 'Enter',
      contextId: MODEL_SELECTION_MODAL_CONTEXT_ID,
      action: () => {
        const btn = document.querySelector(
          '[aria-label="confirm-model-selection"]'
        ) as HTMLButtonElement | null;
        if (!btn || btn.disabled) return;
        btn.click();
      },
      description: 'Selecionar modelo',
      enabled: true,
    },
  ])

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
      id: `${MODULE_NAME}/ModelViewport/saveModel`,
      key: 'Ctrl+s',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => document.getElementById("composer-save-model")?.click(),
      description: 'Save model',
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
      contextId: MATERIAL_LIST_CONTEXT_ID,
      action: () => {
        document.getElementById("composer-add-material")?.click();
      },
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

        // Toggle: if already expanded AND a row inside is focused, do nothing.
        if (wasExpanded && rowFocusedInside) {
          return;
        }

        if (!wasExpanded) summary.click();

        const findFirstRow = () =>
          accordion.querySelector(
            '[data-testid="material-item"]'
          ) as HTMLElement | null;
        const findContent = () =>
          accordion.querySelector(
            '[data-accordion-content="Materiais"]'
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
            const content = findContent();
            if (content) {
              content.focus();
              if (document.activeElement === content) return;
            }
          }
          if (Date.now() - start < 1500) {
            setTimeout(attempt, 50);
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
      contextId: MATERIAL_LIST_CONTEXT_ID,
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
      contextId: MATERIAL_LIST_CONTEXT_ID,
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
      contextId: MATERIAL_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="material-item"]');
        const btn = row?.querySelector('[data-testid="material-item-edit"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Edit focused material',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ModelViewport/renameGarment`,
      key: 'e',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const store = storeManager.functions.getStore();
        if (!store) return;
        const variationId = getActiveVariationId(store);
        if (!variationId) return;
        store.dispatch(selectPart({ variationId, partId: 'garment' }));
        setTimeout(() => {
          ensureGarmentDetailsAccordionExpanded();
          focusGarmentNameInput();
        }, 50);
      },
      description: 'Rename the garment',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ModelViewport/openGarmentDetails`,
      key: 'Ctrl+Alt+p',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const store = storeManager.functions.getStore();
        if (!store) return;
        const variationId = getActiveVariationId(store);
        if (!variationId) return;
        store.dispatch(selectPart({ variationId, partId: 'garment' }));
        setTimeout(ensureGarmentDetailsAccordionExpanded, 50);
      },
      description: 'Select garment and open details accordion',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialItem/deleteMaterial`,
      key: 'd',
      contextId: MATERIAL_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="material-item"]');
        const btn = row?.querySelector('[data-testid="material-item-delete"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Remove focused material',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/GraduationList/focus`,
      key: 'Ctrl+Alt+g',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const accordion = document.querySelector(
          '[role="accordion-Graduações da Peça"]'
        ) as HTMLElement | null;
        if (!accordion) return;
        const summary = accordion.querySelector(
          '[aria-controls="accordion-Graduações da Peça-content"]'
        ) as HTMLElement | null;
        if (!summary) return;

        const isExpanded = () =>
          summary.getAttribute('aria-expanded') === 'true';
        const wasExpanded = isExpanded();
        const rowFocusedInside = !!document.activeElement?.closest(
          '[role="accordion-Graduações da Peça"] [data-testid="graduation-item"]'
        );

        if (wasExpanded && rowFocusedInside) {
          summary.click();
          return;
        }

        if (!wasExpanded) summary.click();

        const findFirstRow = () =>
          accordion.querySelector(
            '[data-testid="graduation-item"]'
          ) as HTMLElement | null;
        const findContent = () =>
          accordion.querySelector(
            '[data-accordion-content="Graduações da Peça"]'
          ) as HTMLElement | null;

        const start = Date.now();
        const attempt = () => {
          const first = findFirstRow();
          if (first) {
            first.focus();
            if (document.activeElement === first) return;
          } else {
            const content = findContent();
            if (content) {
              content.focus();
              if (document.activeElement === content) return;
            }
          }
          if (Date.now() - start < 1500) {
            setTimeout(attempt, 50);
          }
        };
        setTimeout(attempt, 0);
      },
      description: 'Toggle / focus graduation list',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ModelViewport/addGraduation`,
      key: 'a',
      contextId: GRADUATION_LIST_CONTEXT_ID,
      action: () => {
        document.getElementById('composer-add-graduation')?.click();
      },
      description: 'Add graduation',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/GraduationItem/focusNext`,
      key: 'ArrowDown',
      contextId: GRADUATION_LIST_CONTEXT_ID,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="graduation-item"]');
        if (!current) return;
        const next = current.nextElementSibling as HTMLElement | null;
        if (next?.matches('[data-testid="graduation-item"]')) {
          next.focus();
        }
      },
      description: 'Focus next graduation item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/GraduationItem/focusPrev`,
      key: 'ArrowUp',
      contextId: GRADUATION_LIST_CONTEXT_ID,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="graduation-item"]');
        if (!current) return;
        const prev = current.previousElementSibling as HTMLElement | null;
        if (prev?.matches('[data-testid="graduation-item"]')) {
          prev.focus();
        }
      },
      description: 'Focus previous graduation item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/GraduationItem/editGraduation`,
      key: 'r',
      contextId: GRADUATION_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="graduation-item"]');
        const btn = row?.querySelector('[data-testid="graduation-item-edit"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Edit (rename) focused graduation',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/GraduationItem/deleteGraduation`,
      key: 'd',
      contextId: GRADUATION_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="graduation-item"]');
        const btn = row?.querySelector('[data-testid="graduation-item-delete"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Remove focused graduation',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/GraduationItem/moveUp`,
      key: 'w',
      contextId: GRADUATION_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="graduation-item"]') as HTMLElement | null;
        if (!row) return;
        const btn = row.querySelector('[data-testid="graduation-item-move-up"]') as HTMLButtonElement | null;
        if (!btn || btn.disabled) return;
        btn.click();
        // Reordering re-renders the list; refocus same row by id.
        const id = row.id;
        const start = Date.now();
        const attempt = () => {
          const next = document.getElementById(id) as HTMLElement | null;
          if (next) {
            next.focus();
            if (document.activeElement === next) return;
          }
          if (Date.now() - start < 500) setTimeout(attempt, 25);
        };
        setTimeout(attempt, 0);
      },
      description: 'Move focused graduation up',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/VisualizationList/focus`,
      key: 'Ctrl+Alt+v',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const accordion = document.querySelector(
          '[role="accordion-Visualização"]'
        ) as HTMLElement | null;
        if (!accordion) return;
        const summary = accordion.querySelector(
          '[aria-controls="accordion-Visualização-content"]'
        ) as HTMLElement | null;
        if (!summary) return;

        const isExpanded = () =>
          summary.getAttribute('aria-expanded') === 'true';
        const wasExpanded = isExpanded();
        const rowFocusedInside = !!document.activeElement?.closest(
          '[role="accordion-Visualização"] [data-testid="visualization-item"]'
        );

        if (wasExpanded && rowFocusedInside) {
          summary.click();
          return;
        }

        if (!wasExpanded) summary.click();

        const findFirstRow = () =>
          accordion.querySelector(
            '[data-testid="visualization-item"]'
          ) as HTMLElement | null;
        const findAddBtn = () =>
          accordion.querySelector(
            '#composer-add-visualization'
          ) as HTMLElement | null;
        const findContent = () =>
          accordion.querySelector(
            '[data-accordion-content="Visualização"]'
          ) as HTMLElement | null;

        const start = Date.now();
        const attempt = () => {
          const first = findFirstRow();
          if (first) {
            first.focus();
            if (document.activeElement === first) return;
          } else {
            const addBtn = findAddBtn();
            if (addBtn) {
              addBtn.focus();
              if (document.activeElement === addBtn) return;
            } else {
              const content = findContent();
              if (content) {
                content.focus();
                if (document.activeElement === content) return;
              }
            }
          }
          if (Date.now() - start < 1500) {
            setTimeout(attempt, 50);
          }
        };
        setTimeout(attempt, 0);
      },
      description: 'Toggle / focus visualization list',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/VisualizationList/addVisualization`,
      key: 'a',
      contextId: VISUALIZATION_LIST_CONTEXT_ID,
      action: () => {
        document.getElementById('composer-add-visualization')?.click();
      },
      description: 'Add visualization',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/VisualizationItem/focusNext`,
      key: 'ArrowDown',
      contextId: VISUALIZATION_LIST_CONTEXT_ID,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="visualization-item"]');
        if (!current) return;
        const next = current.nextElementSibling as HTMLElement | null;
        if (next?.matches('[data-testid="visualization-item"]')) {
          next.focus();
        }
      },
      description: 'Focus next visualization item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/VisualizationItem/focusPrev`,
      key: 'ArrowUp',
      contextId: VISUALIZATION_LIST_CONTEXT_ID,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="visualization-item"]');
        if (!current) return;
        const prev = current.previousElementSibling as HTMLElement | null;
        if (prev?.matches('[data-testid="visualization-item"]')) {
          prev.focus();
        }
      },
      description: 'Focus previous visualization item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/VisualizationItem/editVisualization`,
      key: 'e',
      contextId: VISUALIZATION_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="visualization-item"]');
        const btn = row?.querySelector('[data-testid="visualization-item-edit"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Edit focused visualization',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/VisualizationItem/deleteVisualization`,
      key: 'd',
      contextId: VISUALIZATION_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="visualization-item"]');
        const btn = row?.querySelector('[data-testid="visualization-item-delete"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Remove focused visualization',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ElectiveList/focus`,
      key: 'Ctrl+Alt+e',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const accordion = document.querySelector(
          '[role="accordion-Eletivos da Peça"]'
        ) as HTMLElement | null;
        if (!accordion) return;
        const summary = accordion.querySelector(
          '[aria-controls="accordion-Eletivos da Peça-content"]'
        ) as HTMLElement | null;
        if (!summary) return;

        const isExpanded = () =>
          summary.getAttribute('aria-expanded') === 'true';
        const wasExpanded = isExpanded();
        const rowFocusedInside = !!document.activeElement?.closest(
          '[role="accordion-Eletivos da Peça"] [data-testid="elective-item"]'
        );

        if (wasExpanded && rowFocusedInside) {
          summary.click();
          return;
        }

        if (!wasExpanded) summary.click();

        const findFirstRow = () =>
          accordion.querySelector(
            '[data-testid="elective-item"]'
          ) as HTMLElement | null;
        const findAddBtn = () =>
          accordion.querySelector(
            '#composer-add-elective'
          ) as HTMLElement | null;
        const findContent = () =>
          accordion.querySelector(
            '[data-accordion-content="Eletivos da Peça"]'
          ) as HTMLElement | null;

        const start = Date.now();
        const attempt = () => {
          const first = findFirstRow();
          if (first) {
            first.focus();
            if (document.activeElement === first) return;
          } else {
            const addBtn = findAddBtn();
            if (addBtn) {
              addBtn.focus();
              if (document.activeElement === addBtn) return;
            } else {
              const content = findContent();
              if (content) {
                content.focus();
                if (document.activeElement === content) return;
              }
            }
          }
          if (Date.now() - start < 1500) {
            setTimeout(attempt, 50);
          }
        };
        setTimeout(attempt, 0);
      },
      description: 'Toggle / focus elective list',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ElectiveList/addElective`,
      key: 'a',
      contextId: ELECTIVE_LIST_CONTEXT_ID,
      action: () => {
        document.getElementById('composer-add-elective')?.click();
      },
      description: 'Add elective',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ElectiveItem/focusNext`,
      key: 'ArrowDown',
      contextId: ELECTIVE_LIST_CONTEXT_ID,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="elective-item"]');
        if (!current) return;
        const next = current.nextElementSibling as HTMLElement | null;
        if (next?.matches('[data-testid="elective-item"]')) {
          next.focus();
        }
      },
      description: 'Focus next elective item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ElectiveItem/focusPrev`,
      key: 'ArrowUp',
      contextId: ELECTIVE_LIST_CONTEXT_ID,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="elective-item"]');
        if (!current) return;
        const prev = current.previousElementSibling as HTMLElement | null;
        if (prev?.matches('[data-testid="elective-item"]')) {
          prev.focus();
        }
      },
      description: 'Focus previous elective item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ElectiveItem/editElective`,
      key: 'e',
      contextId: ELECTIVE_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="elective-item"]');
        const btn = row?.querySelector('[data-testid="elective-item-edit"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Edit focused elective',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ElectiveItem/deleteElective`,
      key: 'd',
      contextId: ELECTIVE_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="elective-item"]');
        const btn = row?.querySelector('[data-testid="elective-item-delete"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Remove focused elective',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessList/focus`,
      key: 'Ctrl+Alt+r',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const accordion = document.querySelector(
          '[role="accordion-Processos da Peça"]'
        ) as HTMLElement | null;
        if (!accordion) return;
        const summary = accordion.querySelector(
          '[aria-controls="accordion-Processos da Peça-content"]'
        ) as HTMLElement | null;
        if (!summary) return;

        const isExpanded = () =>
          summary.getAttribute('aria-expanded') === 'true';
        const wasExpanded = isExpanded();
        const rowFocusedInside = !!document.activeElement?.closest(
          '[role="accordion-Processos da Peça"] [data-testid="process-item"]'
        );

        if (wasExpanded && rowFocusedInside) {
          summary.click();
          return;
        }

        if (!wasExpanded) summary.click();

        const findFirstRow = () =>
          accordion.querySelector(
            '[data-testid="process-item"]'
          ) as HTMLElement | null;
        const findAddBtn = () =>
          accordion.querySelector(
            '#composer-add-process'
          ) as HTMLElement | null;
        const findContent = () =>
          accordion.querySelector(
            '[data-accordion-content="Processos da Peça"]'
          ) as HTMLElement | null;

        const start = Date.now();
        const attempt = () => {
          const first = findFirstRow();
          if (first) {
            first.focus();
            if (document.activeElement === first) return;
          } else {
            const addBtn = findAddBtn();
            if (addBtn) {
              addBtn.focus();
              if (document.activeElement === addBtn) return;
            } else {
              const content = findContent();
              if (content) {
                content.focus();
                if (document.activeElement === content) return;
              }
            }
          }
          if (Date.now() - start < 1500) {
            setTimeout(attempt, 50);
          }
        };
        setTimeout(attempt, 0);
      },
      description: 'Toggle / focus process list',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessList/addProcess`,
      key: 'a',
      contextId: PROCESS_LIST_CONTEXT_ID,
      action: () => {
        document.getElementById('composer-add-process')?.click();
      },
      description: 'Add process',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessItem/focusNext`,
      key: 'ArrowDown',
      contextId: PROCESS_LIST_CONTEXT_ID,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="process-item"]');
        if (!current) return;
        const next = current.nextElementSibling as HTMLElement | null;
        if (next?.matches('[data-testid="process-item"]')) {
          next.focus();
        }
      },
      description: 'Focus next process item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessItem/focusPrev`,
      key: 'ArrowUp',
      contextId: PROCESS_LIST_CONTEXT_ID,
      action: () => {
        const current = document.activeElement?.closest('[data-testid="process-item"]');
        if (!current) return;
        const prev = current.previousElementSibling as HTMLElement | null;
        if (prev?.matches('[data-testid="process-item"]')) {
          prev.focus();
        }
      },
      description: 'Focus previous process item',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessItem/editProcess`,
      key: 'e',
      contextId: PROCESS_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="process-item"]');
        const btn = row?.querySelector('[data-testid="process-item-edit"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Edit focused process',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessItem/deleteProcess`,
      key: 'd',
      contextId: PROCESS_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="process-item"]');
        const btn = row?.querySelector('[data-testid="process-item-delete"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Remove focused process',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessItem/linkElective`,
      key: 'w',
      contextId: PROCESS_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="process-item"]');
        const btn = row?.querySelector('[data-testid="process-item-link-elective"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Link focused process to elective',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessItem/linkMaterial`,
      key: 'm',
      contextId: PROCESS_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="process-item"]');
        const btn = row?.querySelector('[data-testid="process-item-link-material"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Link focused process to material',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialItem/openAuditLog`,
      key: 'l',
      contextId: MATERIAL_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="material-item"]');
        const btn = row?.querySelector('[data-testid="material-item-audit-log"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Open cost audit for focused material',
      enabled: true,
    },
    {
      id: UPLOAD_SVG_SHORTCUT_ID,
      key: 'u',
      contextId: SVG_EMPTY_STATE_CONTEXT_ID,
      action: () => {
        const btn = document.querySelector(
          '[data-testid="upload-svg-button"]'
        ) as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Upload SVG to variation',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessTimeList/focus`,
      key: 'Ctrl+g',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const accordion = document.querySelector(
          '[role="accordion-Tempo"]'
        ) as HTMLElement | null;
        if (!accordion) return;
        const summary = accordion.querySelector(
          '[aria-controls="accordion-Tempo-content"]'
        ) as HTMLElement | null;
        if (!summary) return;

        const isExpanded = () =>
          summary.getAttribute('aria-expanded') === 'true';
        const wasExpanded = isExpanded();
        const rowFocusedInside = !!document.activeElement?.closest(
          '[role="accordion-Tempo"] [data-testid="process-time-item"]'
        );

        if (wasExpanded && rowFocusedInside) {
          summary.click();
          return;
        }

        if (!wasExpanded) summary.click();

        const findFirstRow = () =>
          accordion.querySelector(
            '[data-testid="process-time-item"]'
          ) as HTMLElement | null;
        const findContent = () =>
          accordion.querySelector(
            '[data-accordion-content="Tempo"]'
          ) as HTMLElement | null;

        const start = Date.now();
        const attempt = () => {
          const first = findFirstRow();
          if (first) {
            first.focus();
            if (document.activeElement === first) return;
          } else {
            const content = findContent();
            if (content) {
              content.focus();
              if (document.activeElement === content) return;
            }
          }
          if (Date.now() - start < 1500) {
            setTimeout(attempt, 50);
          }
        };
        setTimeout(attempt, 0);
      },
      description: 'Toggle / focus process time list',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessTimeItem/focusNext`,
      key: 'ArrowDown',
      contextId: PROCESS_TIME_LIST_CONTEXT_ID,
      action: () => {
        // Query the full list and navigate by index instead of relying on
        // nextElementSibling: MUI components inside a row (Tooltip,
        // PointerContainer, Chip) can render portal nodes that become DOM
        // siblings of the ListItem, breaking sibling-based navigation.
        const current = document.activeElement?.closest(
          '[data-testid="process-time-item"]'
        );
        if (!current) return;
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-testid="process-time-item"]'
          )
        );
        const idx = items.indexOf(current as HTMLElement);
        if (idx < 0 || idx >= items.length - 1) return;
        items[idx + 1].focus();
      },
      description: 'Focus next process time row',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessTimeItem/focusPrev`,
      key: 'ArrowUp',
      contextId: PROCESS_TIME_LIST_CONTEXT_ID,
      action: () => {
        const current = document.activeElement?.closest(
          '[data-testid="process-time-item"]'
        );
        if (!current) return;
        const items = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-testid="process-time-item"]'
          )
        );
        const idx = items.indexOf(current as HTMLElement);
        if (idx <= 0) return;
        items[idx - 1].focus();
      },
      description: 'Focus previous process time row',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ProcessTimeItem/openAudit`,
      key: 'l',
      contextId: PROCESS_TIME_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest(
          '[data-testid="process-time-item"]'
        );
        const btn = row?.querySelector(
          '[data-testid="process-time-audit-log"]'
        ) as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Open time audit for focused process',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/GraduationItem/moveDown`,
      key: 's',
      contextId: GRADUATION_LIST_CONTEXT_ID,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="graduation-item"]') as HTMLElement | null;
        if (!row) return;
        const btn = row.querySelector('[data-testid="graduation-item-move-down"]') as HTMLButtonElement | null;
        if (!btn || btn.disabled) return;
        btn.click();
        const id = row.id;
        const start = Date.now();
        const attempt = () => {
          const next = document.getElementById(id) as HTMLElement | null;
          if (next) {
            next.focus();
            if (document.activeElement === next) return;
          }
          if (Date.now() - start < 500) setTimeout(attempt, 25);
        };
        setTimeout(attempt, 0);
      },
      description: 'Move focused graduation down',
      enabled: true,
    },
  ])
}