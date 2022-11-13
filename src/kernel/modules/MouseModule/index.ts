import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { Reducer } from "react";
import { IModule } from "../base";

import reducer from "./store/slice";
import {
  floatingDocumentationExpanded,
  floatingDocumentationCollapsed,
} from "./store/actions";
import { MouseModuleState } from "./store/state";
import { useFloatingShortcuts } from "./hooks/useFloatingShortcuts";
import { useFloatingDocumentation } from "./hooks/useFloatingDocumentation";
import { useFloatingShortcutsManager } from "./hooks/useFloatingShortcutsManager";

export interface IMouseModule extends IModule {
  store: {
    actions: {
      floatingDocumentationExpanded: typeof floatingDocumentationExpanded;
      floatingDocumentationCollapsed: typeof floatingDocumentationCollapsed;
    };
    middlewares: ListenerMiddlewareInstance[];
    reducers: {
      MouseModule: Reducer<MouseModuleState, AnyAction>;
    };
  };
  hooks: {
    module: {
      useFloatingShortcutsManager: typeof useFloatingShortcutsManager;
      useFloatingShortcuts: typeof useFloatingShortcuts;
      useFloatingDocumentation: typeof useFloatingDocumentation;
    }
  };
}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const MouseModule: IMouseModule = {
  name: "MouseModule",
  components: {},
  store: {
    actions: {
      floatingDocumentationExpanded,
      floatingDocumentationCollapsed,
    },
    middlewares: [],
    reducers: {
      MouseModule: reducer,
    },
  },
  hooks: {
    module: {
      useFloatingShortcutsManager,
      useFloatingShortcuts,
      useFloatingDocumentation,
    }
  },
  constants: {},
};

export default MouseModule;
