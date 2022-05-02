import {
  configureStore,
  ThunkAction,
  Action,
  AnyAction,
  Middleware,
} from "@reduxjs/toolkit";
import React from "react";
import { IModule } from "@kernel/modules/base";

const staticReducers: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: React.Reducer<any, AnyAction>;
} = {};

const staticMiddlewares: Middleware[] = [];

export const initializeStore = (modules: { [name: string]: IModule }) => {
  const modulesReducers = Object.entries(modules).reduce(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (store, [_name, module]) => ({ ...store, ...module.store.reducers }),
    staticReducers
  );

  const middlewares = Object.entries(modules).reduce(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (acc: Middleware[], [_name, module]) => [
      ...acc,
      ...(module.store.middlewares?.map((listener) => listener.middleware) ??
        []),
    ],
    staticMiddlewares
  );

  // TODO: Add serializableCheck middleware
  return configureStore({
    reducer: modulesReducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).prepend(middlewares),
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppDispatch = any; // typeof store.dispatch;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RootState = ReturnType<(...args: any) => any>; // typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
