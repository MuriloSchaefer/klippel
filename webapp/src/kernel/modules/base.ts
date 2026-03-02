import React, { Reducer } from "react";
import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { StoreManager } from "./Store/hooks/useStoreManager";
import { LayoutManager } from "./Layout/hooks/useLayoutManager";
import { RibbonMenuManager } from "./Layout/hooks/useRibbonMenuManager";
import { ViewportManager } from "./Layout/hooks/useViewportManager";
import { ComponentRegistryManager } from "./Store/hooks/useComponentRegistryManager";
import { StorageAPI, SessionStorageApi } from "../../../electron/preload/storage/typings";
import { KeyboardShortcutsManager } from "./KeyboardShortcuts/managers/keyboardManager";

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
    viewportManager: ViewportManager,
    keyboardManager: KeyboardShortcutsManager
  },
  storage: StorageAPI & SessionStorageApi
}

export interface KernelCalls {
  startModule: (props: StartModuleProps) => void,
  restartModule: (storeManager: StartModuleProps) => void,
  shutdownModule: (storeManager: StoreManager) => void
  postBootInitialization?: (mod: IModule) => void
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
  shortcuts?: Shortcut[];
}

/**
 * Shortcut definition for keyboard shortcuts
 * 
 * @property id - Unique identifier for the shortcut
 * @property key - Key combination (e.g., "Alt+1", "Ctrl+Shift+P")
 * @property contextId - Context in which the shortcut is active
 * @property action - Redux action to dispatch when shortcut is triggered (or null for custom handling)
 * @property description - Human-readable description
 * @property enabled - Whether the shortcut is currently enabled
 */
export interface Shortcut {
  id: string;
  key: string;
  contextId: string;
  action: AnyAction | null;
  description?: string;
  enabled?: boolean;
}

