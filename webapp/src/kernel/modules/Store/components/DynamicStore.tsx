import { configureStore, ListenerMiddlewareInstance, ListenerMiddleware } from "@reduxjs/toolkit";
import React, { Reducer, useCallback, useMemo, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { AnyAction, combineReducers, compose, MiddlewareAPI, Store, StoreEnhancer, StoreEnhancerStoreCreator } from "redux";
import CurrentReducersContext, { ReducersMap } from "../contexts";
import slice from "../slice";

import dynamicMiddlewares from 'redux-dynamic-middlewares'
import { addMiddleware } from 'redux-dynamic-middlewares'

export interface DynamicStore extends Store {
    registerMiddleware: (listener: ListenerMiddlewareInstance)=>void
}

const DynamicStoreProvider = ({ children }: { children: React.ReactNode }) => {

    const [currentReducers, setCurrentReducers] = useState<ReducersMap>({ [slice.name]: slice.reducer })

    const store = useMemo(() => configureStore({
        reducer: combineReducers<{ [name: string]: Reducer<any, AnyAction> }>({ [slice.name]: slice.reducer }),
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(dynamicMiddlewares),
    }), [])

    const registerMiddleware = (listener: ListenerMiddlewareInstance) => {
        addMiddleware(listener.middleware)
    }

    const loadReducers = useCallback((map: ReducersMap) => {
        const next = { ...currentReducers, ...map }
        setCurrentReducers(next)
        store.replaceReducer(combineReducers(next))
    }, [currentReducers])




    return <ReduxProvider store={store}>
        <CurrentReducersContext.Provider value={{
        currentReducers,
        loadReducers,
        registerMiddleware

    }}>
            {children}
        </CurrentReducersContext.Provider>
    </ReduxProvider >
}


export default React.memo(DynamicStoreProvider)