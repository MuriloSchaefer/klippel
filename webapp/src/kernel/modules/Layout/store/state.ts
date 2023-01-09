export type Theme = "Light" | "Dark" 

export interface Tabs {
  [name: string]: RibbonTab;
}
export interface LayoutState {
    theme: Theme;
    activeTab: keyof Tabs
    tabs: Tabs
  }

export interface RibbonTab {
  name: string;
  label: string;
  active: true;
  loaded?: boolean;
  sections: Array<React.ReactNode>;
}

export const layoutInitialState: LayoutState = {
  theme: "Light",
  activeTab: 'file',
  tabs: {
    file: {
      name: 'file',
      active: true,
      label: 'Arquivo',
      loaded: true,
      sections: []
    }
  }
};
