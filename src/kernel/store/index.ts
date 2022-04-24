import { configureStore, ThunkAction, Action } from "@reduxjs/toolkit";
import { useContext } from "react";
import ModulesContext from "@kernel/modules/context";

// eslint-disable-next-line import/no-cycle
import graphModule from "@kernel/modules/Graph";

const staticReducers = {
  ...graphModule.reducers,
};

export const initializeStore = () => {
  const { modules } = useContext(ModulesContext);

  const modulesReducers = Object.entries(modules).reduce(
    (store, [name, module]) => ({ ...store, [name]: module.reducer }),
    staticReducers
  );

  return configureStore({
    reducer: modulesReducers,
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
