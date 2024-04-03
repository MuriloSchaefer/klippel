import _ from "lodash";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { Store } from "@kernel/modules/Store";

import { createBudget } from "../store/budgets/actions";

type BudgetManager = {
  createBudget: (label: string, color: string) => void;
};

export default function useBudgetManager(): BudgetManager {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { useAppDispatch, useAppSelector } = storeModule.hooks;
  const { useViewportManager } = layoutModule.hooks;
  const { selectActiveViewport } = layoutModule.store.selectors;

  const dispatch = useAppDispatch();
  const viewportManager = useViewportManager();
  const activeViewport = useAppSelector(selectActiveViewport);

  return {
    createBudget(label, color) {
      if (!activeViewport) throw Error("No active viewport");
      const id = _.uniqueId("budget-");
      viewportManager.functions.createGroup(id, color);
      viewportManager.functions.addToGroup(activeViewport, id);

      dispatch(createBudget({ id, label, viewportGroup: id }));
    },
  };
}
