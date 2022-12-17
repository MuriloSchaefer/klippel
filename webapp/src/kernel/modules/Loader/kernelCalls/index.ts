import { StoreManager } from "@kernel/modules/Store/manager"
import { MODULE_NAME } from "../constants"


export const start = (storeManager: StoreManager) => {
    console.log('load reducers for module loader')

    storeManager.functions.loadReducer(MODULE_NAME, ()=>null)
    console.log('load middlewares for module loader')
}

export const restart = () => {

}

export const shutdown = () => {

}