import { StoreManager } from "@kernel/modules/Store/manager";

// graphs manager
import { MODULE_NAME } from "../constants";

import slice from '../store/slice'

export const startModule = (storeManager: StoreManager) => {
    console.log('start module', MODULE_NAME)
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)

}