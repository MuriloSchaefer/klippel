import { Tabs } from "@kernel/layout/components/RibbonMenu";
import { Reducer } from "react";
import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";

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
  hooks: { [name: string]: CallableFunction };
}
