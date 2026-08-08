import _ from "lodash";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { Store } from "@kernel/modules/Store";

import type { IComposerModule } from "@system/modules/Composer";

import {
  addItemToBudget,
  createBudget,
  deleteBudget,
  removeItemFromBudget,
  setItemAmount,
} from "../store/budgets/actions";
import { BudgetItemState } from "../store/state";

type BudgetManager = {
  /** Creates the budget, its tab group, and seeds it with the active model. */
  createBudget: (label: string, color: string) => string;
  /** Adds the active model to an existing budget and joins its tab group. */
  addToBudget: (budgetId: string) => string;
  removeFromBudget: (budgetId: string, itemId: string) => void;
  deleteBudget: (budgetId: string) => void;
  setAmount: (budgetId: string, itemId: string, amount: number) => void;
};

/**
 * Five hex characters, generated once when a model is added to a budget and
 * persisted with it. Keeps two lines for the same model distinguishable while
 * staying stable across restarts — which `variationId` is not.
 */
const itemHash = () => Math.random().toString(16).slice(2, 7).padEnd(5, "0");

export default function useBudgetManager(): BudgetManager {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const composerModule = useModule<IComposerModule>("Composer");

  const { useAppDispatch } = storeModule.hooks;
  const { useViewportManager, useActiveViewport } = layoutModule.hooks;
  const { useVariationUnitCost } = composerModule.hooks;

  const dispatch = useAppDispatch();
  const viewportManager = useViewportManager();
  const activeVP = useActiveViewport();

  const activeViewport = activeVP?.name;
  const modelId = activeVP?.extra?.id as string | undefined;
  const variationId = activeVP?.extra?.variationId as string | undefined;
  const modelName = activeVP?.title ?? "";

  // Same numbers the Custo and Tempo accordions show. Captured at add time
  // because the variation graph only exists while its viewport is open, and a
  // budget has to price — and time — lines whose viewports are closed.
  const { totalMoneyPerUnit, totalMinutesPerUnit, grades, totalGarments } =
    useVariationUnitCost(variationId);

  const buildItem = (): BudgetItemState => {
    if (!modelId) throw Error("Active viewport has no model");
    return {
      itemId: `${modelId}-${itemHash()}`,
      modelId,
      label: modelName,
      addedAt: Date.now(),
      // Quantity comes from the size curve: the line is for however many
      // garments the variation is graded for. Falls back to 1 when the
      // variation has no grades yet, so an ungraded piece is still quotable.
      amount: totalGarments > 0 ? totalGarments : 1,
      grades: grades.length > 0 ? grades : undefined,
      unitCost: totalMoneyPerUnit > 0 ? totalMoneyPerUnit : undefined,
      unitMinutes: totalMinutesPerUnit > 0 ? totalMinutesPerUnit : undefined,
      costCapturedAt: Date.now(),
    };
  };

  const link = (budgetId: string, itemId: string) => {
    if (!activeViewport || !activeVP) return;
    viewportManager.functions.addToGroup(activeViewport, budgetId);
    viewportManager.functions.setExtras(activeViewport, {
      ...activeVP.extra,
      budgetId,
      budgetItemId: itemId,
    });
  };

  return {
    createBudget(label, color) {
      if (!activeViewport) throw Error("No active viewport");
      const id = _.uniqueId("budget-");
      const item = buildItem();

      viewportManager.functions.createGroup(id, color, label);
      dispatch(
        createBudget({
          id,
          label,
          color,
          viewportGroup: id,
          items: { [item.itemId]: item },
          createdAt: Date.now(),
        })
      );
      link(id, item.itemId);

      return id;
    },
    addToBudget(budgetId) {
      if (!activeViewport) throw Error("No active viewport");
      const item = buildItem();

      dispatch(addItemToBudget({ budgetId, item }));
      link(budgetId, item.itemId);

      return item.itemId;
    },
    removeFromBudget(budgetId, itemId) {
      dispatch(removeItemFromBudget({ budgetId, itemId }));
      if (!activeViewport || !activeVP) return;
      viewportManager.functions.removeFromGroup(activeViewport);
      viewportManager.functions.setExtras(activeViewport, {
        ..._.omit(activeVP.extra, ["budgetId", "budgetItemId"]),
      });
    },
    setAmount(budgetId, itemId, amount) {
      dispatch(setItemAmount({ budgetId, itemId, amount }));
    },
    deleteBudget(budgetId) {
      // Group unwinding and file deletion happen in the budgets middleware,
      // which can see every member viewport — not just the active one.
      dispatch(deleteBudget({ id: budgetId }));
    },
  };
}
