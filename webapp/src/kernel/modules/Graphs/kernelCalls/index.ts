import { StoreManager } from "@kernel/modules/Store/manager";

// graphs manager
import slice from "../store/graphsManager/slice"
import middlewares from "../store/graphsManager/middlewares"
import { MODULE_NAME } from "../constants";

export const startModule = (storeManager: StoreManager) => {
    console.group('Starting graphs module')
    console.log('[Graph Module] Loading graphs manager ')
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
    storeManager.functions.registerMiddleware( middlewares)

    console.groupEnd()
}