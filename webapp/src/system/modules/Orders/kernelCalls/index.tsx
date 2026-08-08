import { PostBootInitializationProps, StartModuleProps } from "@kernel/modules/base";

import { MODEL_VIEWPORT_SETTINGS_REGISTRY_NAME } from "@system/modules/Composer/constants";

import slice from "../store/slice";
import {
  ADD_TO_BUDGET_SHORTCUT_ID,
  BUDGET_FOCUS_SHORTCUT_ID,
  BUDGET_LIST_CONTEXT_ID,
  CREATE_BUDGET_SHORTCUT_ID,
  MODULE_NAME,
} from "../constants";

import budgetMiddleware from "../store/budgets/middlewares";
import moduleMiddleware from "../store/middlewares";
import { sessionSaver } from "../store/session";
import BudgetAccordion from "../components/BudgetAccordion";

export function startModule({
  managers: { storeManager, componentRegistryManager },
  storage,
}: StartModuleProps) {
  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);
  storeManager.functions.registerMiddleware(budgetMiddleware);
  storeManager.functions.registerMiddleware(moduleMiddleware);

  // Budgets reach disk only through the whole-session save, so Orders has to be
  // on the session-save listener list — without this nothing is ever written.
  const store = storeManager.functions.getStore();
  storage.registerSessionSaveListener(
    store
      ? sessionSaver(store)
      : () => console.log("Missing store. skipping session save!"),
  );

  // Composer opens this registry in its own startModule; Orders loads after it.
  componentRegistryManager.functions.registerComponents({
    [MODEL_VIEWPORT_SETTINGS_REGISTRY_NAME]: {
      BudgetAccordion,
    },
  });
}

const ACCORDION_NAME = "Orçamento";

export function postBootInitialization({
  managers: { keyboardManager },
}: PostBootInitializationProps) {
  keyboardManager.functions.registerShortcuts([
    {
      id: BUDGET_FOCUS_SHORTCUT_ID,
      key: "Ctrl+Alt+o",
      // Composer's ModelViewport context — the accordion only exists there.
      contextId: "Composer/ModelViewport",
      action: () => {
        const summary = document.querySelector(
          `[role="accordion-${ACCORDION_NAME}"] [aria-controls="accordion-${ACCORDION_NAME}-content"]`,
        ) as HTMLElement | null;
        if (!summary) return;
        // Collapsed → open it; the Accordion's `focusOnOpen` moves focus to the
        // first row once the transition settles.
        if (summary.getAttribute("aria-expanded") !== "true") {
          summary.click();
          return;
        }
        summary.focus();
      },
      description: "Focus the budget accordion",
      enabled: true,
    },
    {
      id: CREATE_BUDGET_SHORTCUT_ID,
      key: "c",
      contextId: BUDGET_LIST_CONTEXT_ID,
      action: () => document.getElementById("create-budget")?.click(),
      description: "Create a budget with the open model",
      enabled: true,
    },
    {
      id: ADD_TO_BUDGET_SHORTCUT_ID,
      key: "a",
      contextId: BUDGET_LIST_CONTEXT_ID,
      action: () => document.getElementById("add-to-budget")?.click(),
      description: "Add the open model to an existing budget",
      enabled: true,
    },
  ]);
}
