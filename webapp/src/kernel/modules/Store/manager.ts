import { Manager } from "@kernel/modules/base";
import { AnyAction } from "redux";
import { ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { Reducer, useContext } from "react";
import CurrentReducersContext from "./contexts";

export type AppAction = AnyAction

export interface StoreManager extends Manager {
    functions: {
        loadReducer: (key: string, reducer: Reducer<any, AnyAction>) => void
        //unloadReducer: (moduleName: string) => void
        registerMiddleware: (middleware: ListenerMiddlewareInstance) => void,
        unRegisterMiddleware: (middleware: ListenerMiddlewareInstance) => void,
    }
}

/**
 * Store Manager is the responsible for maintaining redux configuration
 * i.e. adding/removing reducers and middlewares
 * 
 */
export const useStoreManager = (): StoreManager => {

    const { currentReducers, setCurrentReducers, registerMiddleware, unRegisterMiddleware } = useContext(CurrentReducersContext)


    const manager: StoreManager = {
        functions: {
            loadReducer: (key, reducer) => {
                setCurrentReducers({...currentReducers, [key]: reducer })
            },
            registerMiddleware: (middleware: ListenerMiddlewareInstance) => {
                registerMiddleware(middleware)
            },
            unRegisterMiddleware: (middleware: ListenerMiddlewareInstance) => {
                unRegisterMiddleware(middleware)
            }
        }
    }
    return manager
}

export default useStoreManager