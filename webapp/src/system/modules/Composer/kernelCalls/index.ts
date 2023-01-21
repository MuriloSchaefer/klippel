import { ILayoutModule } from "@kernel/modules/Layout";
import { ModulesContextType } from "@kernel/modules/Loader/context";
import { StoreManager } from "@kernel/modules/Store/manager";
import { MODULE_NAME } from "../constants";

//import slice from "../store/Slice";

export function startModule(storeManager: StoreManager){
    console.log('starting composer module', storeManager)
    //storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
    //storeManager.functions.registerMiddleware(middleware)
}