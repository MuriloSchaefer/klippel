import { createSelector } from "reselect";
import { BudgetState, OrdersModuleState } from "../state";

export const selectOrdersModule = (state: { Orders: OrdersModuleState }) =>
  state.Orders;

export const selectBudgetsMap = createSelector(
  selectOrdersModule,
  (state: OrdersModuleState | undefined) => state?.budgets
);

export const selectBudget = (id: string) =>
  createSelector(
    selectOrdersModule,
    (state: OrdersModuleState | undefined) => state?.budgets?.[id]
  );

/** Cheap cardinality mirror — avoids re-deriving the sorted list just to count. */
export const selectBudgetCount = createSelector(
  selectBudgetsMap,
  (budgets) => Object.keys(budgets ?? {}).length
);

export const listBudgets = () =>
  createSelector(selectBudgetsMap, (budgets) =>
    Object.values(budgets ?? {}).sort((a, b) => a.createdAt - b.createdAt)
  );

/**
 * The budget holding this item, if any. This is the *only* way membership is
 * resolved: there is deliberately no "budgets containing this model" selector,
 * because a second variation of a model already in a budget must start out
 * unattached until the user explicitly adds it.
 */
export const selectBudgetByItem = (itemId: string | undefined) =>
  createSelector(selectBudgetsMap, (budgets): BudgetState | undefined => {
    if (!itemId) return undefined;
    return Object.values(budgets ?? {}).find((budget) => itemId in (budget.items ?? {}));
  });
