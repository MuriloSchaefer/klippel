import React, { useMemo } from "react";

import Box from "@mui/material/Box";
import RequestQuoteSharpIcon from "@mui/icons-material/RequestQuoteSharp";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { Store } from "@kernel/modules/Store";

import {
  BUDGET_FOCUS_SHORTCUT_ID,
  BUDGET_LIST_CONTEXT_ID,
} from "../../constants";
import {
  selectBudgetByItem,
  selectBudgetCount,
} from "../../store/budgets/selectors";
import BudgetDetails from "./BudgetDetails";
import BudgetActions from "./BudgetActions";

export type BudgetAccordionProps = Readonly<{
  variationId: string;
  modelId: string;
  /** Settings-panel collapse state, forwarded by `SettingsPanelExtensions`. */
  state?: "expanded" | "collapsed";
}>;

/**
 * Mounted into the ModelViewport settings panel through Composer's
 * `composerModelViewportSettings` registry — Composer cannot import Orders,
 * since Orders is the one that depends on Composer.
 *
 * Membership belongs to *this viewport's* item, not to the model: opening a
 * model again (a new variation) starts outside every budget, and only an
 * explicit "Criar" / "Adicionar" puts it in one. So the branch is decided
 * purely by the viewport's own `extra.budgetItemId`, never by looking up other
 * items that happen to share the model id.
 * See `docs/changes/2026-08-06-56f6e4-*`.
 */
function BudgetAccordion({ state }: BudgetAccordionProps) {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const storeModule = useModule<Store>("Store");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");

  const { Accordion } = layoutModule.components;
  const { focusFirstRow } = layoutModule.utils;
  const { useActiveViewport } = layoutModule.hooks;
  const { FocusShortcutProvider } = keyboardShortcutsModule.components;
  const { useAppSelector } = storeModule.hooks;

  const activeVP = useActiveViewport();
  const budgetItemId = activeVP?.extra?.budgetItemId as string | undefined;

  // Resolved from this viewport's own item id only. A budget whose items happen
  // to share this model is deliberately *not* consulted — another variation of
  // the same model is a separate thing until the user adds it.
  const budget = useAppSelector(
    useMemo(() => selectBudgetByItem(budgetItemId), [budgetItemId])
  );

  // Wait mirrors for e2e (e2e-tests.md §2): how many budgets exist at all, and
  // how many items the current one holds. Both are single-selector waits, so
  // tests never poll the DOM from inside `waitForFunction`.
  const budgetCount = useAppSelector(selectBudgetCount);
  const itemCount = budget ? Object.keys(budget.items ?? {}).length : 0;

  return (
    <FocusShortcutProvider contextId={BUDGET_LIST_CONTEXT_ID}>
      <Accordion
        state={state}
        shortcutHint={BUDGET_FOCUS_SHORTCUT_ID}
        name="Orçamento"
        icon={<RequestQuoteSharpIcon />}
        summary={
          budget ? budget.label : "Orçamento ao qual esta peça pertence"
        }
        focusOnOpen={focusFirstRow}
      >
        <Box
          id="budget-accordion"
          data-testid="budget-accordion"
          data-budget-id={budget?.id}
          data-budget-label={budget?.label}
          data-budget-item-count={itemCount}
          data-budget-count={budgetCount}
        >
          {budget ? (
            <BudgetDetails budget={budget} itemId={budgetItemId} />
          ) : (
            <BudgetActions />
          )}
        </Box>
      </Accordion>
    </FocusShortcutProvider>
  );
}

export default React.memo(BudgetAccordion);
