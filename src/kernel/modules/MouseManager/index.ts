import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { Reducer } from "react";
import { IModule } from "../base";

import reducer from "./store/slice";
import {
  floatingDocumentationExpanded,
  floatingDocumentationCollapsed,
} from "./store/actions";
import { MouseManagerState } from "./store/state";
import { useFloatingShortcuts } from "./hooks/useFloatingShortcuts";
import { useFloatingDocumentation } from "./hooks/useFloatingDocumentation";
import { useFloatingShortcutsManager } from "./hooks/useFloatingShortcutsManager";

export interface IMouseManagerModule extends IModule {
  store: {
    actions: {
      floatingDocumentationExpanded: typeof floatingDocumentationExpanded;
      floatingDocumentationCollapsed: typeof floatingDocumentationCollapsed;
    };
    middlewares: ListenerMiddlewareInstance[];
    reducers: {
      MouseManager: Reducer<MouseManagerState, AnyAction>;
    };
  };
  hooks: {
    useFloatingShortcutsManager: typeof useFloatingShortcutsManager;
    useFloatingShortcuts: typeof useFloatingShortcuts;
    useFloatingDocumentation: typeof useFloatingDocumentation;
  };
}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const MouseManagerModule: IMouseManagerModule = {
  name: "MouseManager",
  components: {},
  store: {
    actions: {
      floatingDocumentationExpanded,
      floatingDocumentationCollapsed,
    },
    middlewares: [],
    reducers: {
      MouseManager: reducer,
    },
  },
  hooks: {
    useFloatingShortcutsManager,
    useFloatingShortcuts,
    useFloatingDocumentation,
  },
  constants: {},
};

export default MouseManagerModule;
