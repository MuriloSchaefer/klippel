import { IModule } from "@kernel/modules/base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule, postBootInitialization } from "./kernelCalls";
import useBudgetManager from "./hooks/useBudgetManager";
import BudgetAccordion from "./components/BudgetAccordion";
import BudgetSelector from "./components/BudgetSelector";
import {
  listBudgets,
  selectBudget,
  selectBudgetByItem,
} from "./store/budgets/selectors";

export interface IOrderModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {
    BudgetAccordion: typeof BudgetAccordion,
    BudgetSelector: typeof BudgetSelector,
  },
  hooks: {
    useBudgetManager: typeof useBudgetManager
  },
  store: {
    selectors: {
      listBudgets: typeof listBudgets,
      selectBudget: typeof selectBudget,
      selectBudgetByItem: typeof selectBudgetByItem,
    }
  }
}

/**
 * Orders owns budgets ("orçamentos") — named, coloured collections of model
 * items. Each budget is backed by a Layout viewport group, so its items' tabs
 * read as one visual set.
 */
const module: IOrderModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: ['Composer'],
  components: {
    BudgetAccordion,
    BudgetSelector,
  },
  hooks: {useBudgetManager},
  store: {
    selectors: {listBudgets, selectBudget, selectBudgetByItem},
  },
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){},
    postBootInitialization,
  }
}

export default module;
