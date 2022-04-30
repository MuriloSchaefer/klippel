import {
  configureStore,
  ThunkAction,
  Action,
  AnyAction,
  Middleware,
} from "@reduxjs/toolkit";
import React, { useContext } from "react";
import ModulesContext from "@kernel/modules/context";

// eslint-disable-next-line import/no-cycle
import graphModule from "@kernel/modules/GraphsManager";

const staticReducers: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: React.Reducer<any, AnyAction>;
} = {
  ...graphModule.store.reducers,
};

export const initializeStore = () => {
  const { modules } = useContext(ModulesContext);

  const modulesReducers = Object.entries(modules).reduce(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (store, [_name, module]) => ({ ...store, ...module.store.reducers }),
    staticReducers
  );

  const middlewares = Object.entries(modules).reduce(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (acc: Middleware[], [_name, module]) => [
      ...acc,
      ...(module.store.middlewares ?? []),
    ],
    []
  );

  return configureStore({
    reducer: modulesReducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(middlewares),
  });
};

// QUESTION: how to type this?

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
