import { Tabs } from "@kernel/layout/components/RibbonMenu";
import { Reducer } from "react";
import { Middleware, AnyAction } from "@reduxjs/toolkit";
import { GraphsManagerState } from "./GraphsManager/store/state";

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
    middlewares?: Middleware[]; // Middlewares used by the module
    reducers: { [key: string]: Reducer<GraphsManagerState, AnyAction> }; // Reducers used by the module
  };
  hooks: { [name: string]: CallableFunction };
}
