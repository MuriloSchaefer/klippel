import { Tabs } from "@kernel/layout/RibbonMenu";
import { Reducer } from "react";

export interface IModule {
  name: string;
  components: {
    ribbonTabs?: Tabs; // Ribon tabs used by the module
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewport?: any; // Viewport component
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reducers?: { [key: string]: Reducer<any, any> }; // Reducers used by the module
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actions?: { [key: string]: any }; // Actions used by the module
  hooks: { [name: string]: CallableFunction };
}
