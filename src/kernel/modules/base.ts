import { Tabs } from "@kernel/layout/RibbonMenu";

export interface IModule {
  name: string;
  ribbonTabs?: Tabs; // Ribon tabs used by the module
  hooks: Array<CallableFunction>;
}
