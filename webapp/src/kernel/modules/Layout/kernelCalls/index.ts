import { StoreManager } from "@kernel/modules/Store/manager";

// graphs manager
import { MODULE_NAME } from "../constants";
import layoutMiddleware from "../store/middlewares";
import viewportMiddleware from "../store/viewports/middlewares";

import slice from '../store/slice'

export const startModule = (storeManager: StoreManager) => {
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
    storeManager.functions.registerMiddleware(layoutMiddleware)
    storeManager.functions.registerMiddleware(viewportMiddleware)
}