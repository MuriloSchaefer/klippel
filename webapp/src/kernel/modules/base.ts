import React, { Reducer } from "react";
import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { StoreManager } from "./Store/hooks/useStoreManager";
import { LayoutManager } from "./Layout/hooks/useLayoutManager";
import { RibbonMenuManager } from "./Layout/hooks/useRibbonMenuManager";
import { ViewportManager } from "./Layout/hooks/useViewportManager";
import { ComponentRegistryManager } from "./Store/hooks/useComponentRegistryManager";
import { StorageAPI, SessionStorageApi } from "../../../electron/preload/storage/typings"; // TODO: find a common place for typings

export interface Manager {
  functions: {
    [name: string]: CallableFunction
  }
}

export interface StartModuleProps {
  dispatch: any,
  managers: {
    storeManager: StoreManager
    componentRegistryManager: ComponentRegistryManager
    layoutManager: LayoutManager
    ribbonMenuManager: RibbonMenuManager
    viewportManager: ViewportManager
  },
  storage: StorageAPI & SessionStorageApi
}

export interface KernelCalls {
  startModule: (props: StartModuleProps) => void,
  restartModule: (storeManager: StartModuleProps) => void,
  shutdownModule: (storeManager: StoreManager) => void
}

interface ManagersMap {
  [name: string]: <Args>(args: Args) => Manager
}

type ComponentsMap = {
  [name: string]: React.FunctionComponent<any> 
}

export interface IModule{
  name: string;
  version: string;
  depends_on: string[];
  components?: ComponentsMap;
  store?: {
    actions?: { 
      commands?: {[key: string]: any},
      events?: {[key: string]: any},
     }; // Actions used by the module
    middlewares?: ListenerMiddlewareInstance[]; // Middlewares used by the module
    selectors?: { [key: string]: any }; // Selectors used by the module
    reducers?: { [key: string]: Reducer<any, AnyAction> }; // Reducers used by the module
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

