import _ from "lodash";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { Store } from "@kernel/modules/Store";

import { createBudget } from "../store/budgets/actions";
import { IComposerModule } from "@system/modules/Composer";

type BudgetManager = {
  createBudget: (label: string, color: string) => void;
  addTobudget: (budgetId: string)=>void;
};

export default function useBudgetManager(): BudgetManager {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const composerModule = useModule<IComposerModule>("Composer");

  const { useAppDispatch, useAppSelector } = storeModule.hooks;
  const { useViewportManager } = layoutModule.hooks;
  const { selectActiveViewport } = layoutModule.store.selectors;
  const {useComposition} = composerModule.hooks

  const dispatch = useAppDispatch();
  const viewportManager = useViewportManager();
  const activeViewport = useAppSelector(selectActiveViewport);
  const composer = useComposition({viewportName: activeViewport}, c => c?.name)

  return {
    createBudget(label, color) {
      if (!activeViewport) throw Error("No active viewport");
      const id = _.uniqueId("budget-");
      viewportManager.functions.createGroup(id, color);
      viewportManager.functions.addToGroup(activeViewport, id);

      dispatch(createBudget({ id, label, viewportGroup: id }));

      composer.actions.addToBudget(composer.state!, id)
    },
    addTobudget(budgetId){
      if (!activeViewport) throw Error("No active viewport");
      viewportManager.functions.addToGroup(activeViewport, budgetId);
      composer.actions.addToBudget(composer.state!, budgetId)
    }
  };
}
