import { Reducer } from "react";
import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { Tabs } from "./LayoutModule/components/RibbonMenu";

export interface IModule {
  name: string;
  components: {
    ribbonTabs?: Tabs; // Ribon tabs used by the module
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewport?: any; // Viewport component
  };
  store: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions?: { [key: string]: any }; // Actions used by the module
    middlewares?: ListenerMiddlewareInstance[]; // Middlewares used by the module
    selectors?: { [key: string]: any }; // Selectors used by the module
    reducers: { [key: string]: Reducer<any, AnyAction> }; // Reducers used by the module
  };
  hooks: {
    system?: { // methods called by the system
      afterModuleLoad: ()=>void 
    }, 
    module?: { [name: string]: CallableFunction }
  };
  constants?: {
    [key: string]: unknown;
  };
}
