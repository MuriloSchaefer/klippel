import { IModule } from "@kernel/modules/base";
import {MODULE_NAME, MODULE_VERSION} from "./constants"
import { startModule } from "./kernelCalls";
import useBudgetManager from "./hooks/useBudgetManager";
import BudgetFloatingButton from "./components/BudgetFloatingButton";


export interface IOrderModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {
    BudgetFloatingButton: typeof BudgetFloatingButton
  },
  hooks: {
    useBudgetManager: typeof useBudgetManager
  }
}

/**
 * Graph module is a kernel component
 * that manages graphs for the application.
 * Kernel uses it for things such:
 * modules tree,
 * ui state management,
 * etc.
 */
const module: IOrderModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: ['Composer'],
  components: {
    BudgetFloatingButton
  },
  hooks: {useBudgetManager},
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){}
  }
}

export default module;
