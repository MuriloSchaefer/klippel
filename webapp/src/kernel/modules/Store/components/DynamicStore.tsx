import {
  configureStore,
  ListenerMiddlewareInstance,
} from "@reduxjs/toolkit";
import React, { Reducer, useCallback, useMemo, useState } from "react";
import { Provider as ReduxProvider } from "react-redux";
import {
  combineReducers,
  Store,
  UnknownAction,
  type Middleware,
} from "redux";
import CurrentReducersContext, { ReducersMap } from "../contexts";
import slice from "../slice";

import dynamicMiddlewares from "redux-dynamic-middlewares";
import { addMiddleware } from "redux-dynamic-middlewares";
import ComponentsRegistryProvider from "./ComponentsRegistry";
import middlewares from "../middlewares";

export interface DynamicStore extends Store {
  registerMiddleware: (listener: ListenerMiddlewareInstance) => void;
}

const DynamicStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentReducers, setCurrentReducers] = useState<ReducersMap>({
    [slice.name]: slice.reducer,
  });

  const store = useMemo(
    () =>configureStore({
      reducer: combineReducers<{ [name: string]: Reducer<any, UnknownAction> }>({
        [slice.name]: slice.reducer,
      }),
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false })
          .concat(dynamicMiddlewares as Middleware)
          .concat(middlewares.middleware),
    }),
    []
  );

  const registerMiddleware = (listener: ListenerMiddlewareInstance) => {
    addMiddleware(listener.middleware);
  };

  const loadReducers = useCallback(
    (map: ReducersMap) => {
      const next = { ...currentReducers, ...map };
      setCurrentReducers(next);
      store.replaceReducer(combineReducers(next));
    },
    [currentReducers]
  );

  const getStore = useCallback(()=>store, [store])

  return (
      <ReduxProvider store={store}>
        <CurrentReducersContext.Provider
          value={{
            currentReducers,
            loadReducers,
            registerMiddleware,
            getStore
          }}
        >
            <ComponentsRegistryProvider>{children}</ComponentsRegistryProvider>
        </CurrentReducersContext.Provider>
      </ReduxProvider>
  );
};

export default React.memo(DynamicStoreProvider);
