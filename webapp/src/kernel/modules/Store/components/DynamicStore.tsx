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
    () => {
      const s = configureStore({
        reducer: combineReducers<{ [name: string]: Reducer<any, UnknownAction> }>({
          [slice.name]: slice.reducer,
        }),
        // `immutableCheck` is off for the same reason `serializableCheck` is:
        // in development RTK deep-walks the *entire* store before and after
        // every dispatch, and the Materials catalog alone is multiple MB. That
        // cost lands on every action in the app — a keystroke, a hover, a
        // viewport-extra patch — not just the ones touching the big slices, and
        // it was a large part of why the dev build sat at 100% CPU
        // (docs/analysis/materials-catalog-lag-analysis.md, F6). To bring it
        // back when hunting an accidental-mutation bug, set
        // `globalThis.__klippelImmutableCheck__ = true` before boot (DevTools
        // console, then reload) — the store is built once, so the flag is read
        // once.
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: false,
            immutableCheck:
              (globalThis as { __klippelImmutableCheck__?: boolean })
                .__klippelImmutableCheck__ === true,
          })
            .concat(dynamicMiddlewares as Middleware)
            .concat(middlewares.middleware),
      });
      // Expose the store for puppeteer-driven e2e soft-reset (dispatches
      // selectWorkspace + per-slice rehydrate from the test helper). Harmless
      // outside tests; the renderer doesn't read it.
      (globalThis as unknown as { __klippelStore__?: typeof s }).__klippelStore__ = s;
      return s;
    },
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
