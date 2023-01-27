import { ComponentTypeMap } from "@kernel/modules/Store/contexts/componentRegistry";

export interface RibbonTab {
    name: string;
    type: "dropdown" | "base"
    label: string;
    active: boolean;
    loaded?: boolean;
    sections?: ComponentTypeMap;
  }

export interface RibbonTabState extends RibbonTab {
  sectionNames: string[]
}

export interface Tabs {
    [name: string]: RibbonTabState;
  }

export interface RibbonMenuState {
    activeTab: string,
    tabs: Tabs
}