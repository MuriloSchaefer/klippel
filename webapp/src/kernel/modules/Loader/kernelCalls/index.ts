import { StoreManager } from "@kernel/modules/Store/manager"
import { MODULE_NAME } from "../constants"
import slice from "../store/slice"


export const start = (storeManager: StoreManager) => {
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
}

export const restart = () => {

}

export const shutdown = () => {

}