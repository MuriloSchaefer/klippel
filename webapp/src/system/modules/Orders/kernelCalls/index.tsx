import { StartModuleProps } from "@kernel/modules/base";
import slice from "../store/slice";
import { MODULE_NAME } from "../constants";

import budgetMiddleware from '../store/budgets/middlewares'

export function startModule({
  managers: {
    storeManager,
    componentRegistryManager,
    layoutManager,
    ribbonMenuManager,
    viewportManager,
  },
}: StartModuleProps) {
  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
  storeManager.functions.registerMiddleware(budgetMiddleware)
}
