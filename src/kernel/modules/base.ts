import { Tabs } from "@kernel/layout/RibbonMenu";

export interface IModule {
  ribbonTabs?: Tabs; // Ribon tabs used by the module
  hooks: Array<CallableFunction>;
}
