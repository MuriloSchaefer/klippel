import React, { Reducer } from "react";
import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { Tabs } from "./LayoutModule/components/RibbonMenu";
import { StoreManager } from "./Store/manager";

export interface Manager {
  functions: {
    [name: string]: CallableFunction
  }
}

export interface KernelCalls {
  startModule: (storeManager: StoreManager) => void,
  restartModule: (storeManager: StoreManager) => void,
  shutdownModule: (storeManager: StoreManager) => void
}

interface ManagersMap {
  [name: string]: <Args>(args: Args) => Manager
}
export interface IModule {
  name: string;
  version: string;
  depends_on: string[];
  components?: {
    [name: string]: React.FunctionComponent
  };
  store?: {
    actions?: { 
      commands?: {[key: string]: any},
      events?: {[key: string]: any},
     }; // Actions used by the module
    middlewares?: ListenerMiddlewareInstance[]; // Middlewares used by the module
    selectors?: { [key: string]: any }; // Selectors used by the module
    reducers: { [key: string]: Reducer<any, AnyAction> }; // Reducers used by the module
  };
  kernelCalls: KernelCalls,
  managers?: ManagersMap,
  hooks?: {
    [name: string]: CallableFunction,
  };
  constants?: {
    [key: string]: unknown;
  };
}

