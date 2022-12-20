import { StoreManager } from "@kernel/modules/Store/manager";

// graphs manager
import { MODULE_NAME } from "../constants";

import managerSlice from "../store/graphsManager/slice"
import managerMiddlewares from "../store/graphsManager/middlewares"

import instanceSlice from "../store/graphInstance/slice"
import instanceMiddlewares from "../store/graphInstance/middlewares"

export const startModule = (storeManager: StoreManager) => {
    storeManager.functions.loadReducer(MODULE_NAME, managerSlice.reducer)
    storeManager.functions.registerMiddleware(managerMiddlewares)
    storeManager.functions.registerMiddleware(instanceMiddlewares)

}