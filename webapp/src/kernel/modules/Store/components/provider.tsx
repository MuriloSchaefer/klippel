import { configureStore, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import React, { useCallback, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { combineReducers } from "redux";
import CurrentReducersContext, { ReducersMap } from "../contexts";
import slice from "../slice";

import dynamicMiddlewares from 'redux-dynamic-middlewares'
import { addMiddleware, removeMiddleware } from 'redux-dynamic-middlewares'


const DynamicStore = ({ children }: { children: React.ReactNode }) => {

    const [currentReducers, setCurrentReducers] = useState<ReducersMap>({ [slice.name]: slice.reducer })

    const [store, setStore] = useState(configureStore({
        reducer: combineReducers({ [slice.name]: slice.reducer }),
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({ serializableCheck: true }).concat(dynamicMiddlewares),
        enhancers: []
    }))


    const handleSetReducers = useCallback((next: ReducersMap) => {
        setCurrentReducers({ ...currentReducers, ...next })
        store.replaceReducer(combineReducers({ ...currentReducers, ...next }))
    }, [])

    const registerMiddleware = (listener: ListenerMiddlewareInstance) => {
        addMiddleware(listener.middleware)

    }

    const unRegisterMiddleware = (listener: ListenerMiddlewareInstance) => {
        removeMiddleware(listener.middleware)
    }

    return <ReduxProvider store={store}>
        <CurrentReducersContext.Provider value={{
            currentReducers,
            setCurrentReducers: handleSetReducers,
            registerMiddleware,
            unRegisterMiddleware

        }}>
            {children}
        </CurrentReducersContext.Provider>
    </ReduxProvider >
}


export default React.memo(DynamicStore)