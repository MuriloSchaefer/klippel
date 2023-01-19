import {PaletteColor, PaletteMode} from '@mui/material'

export type Theme = PaletteMode

export interface Tabs {
  [name: string]: Omit<RibbonTab, "sections">;
}

export interface PanelState {
  open: boolean;
  title: string;
}
export interface Panels {
  settings: PanelState,
  details: PanelState
}
export interface ViewportState {
  name: string
  title: string;
  type: string;
  group?: string
}
export interface ViewportGroupState {
  name: string;
  color: string;
}
export interface ViewportGroups {
  [name: string]: ViewportGroupState
}
export interface viewportManagerState {
  groups: ViewportGroups
  viewports: {[name: string]: ViewportState}
}
export interface LayoutState {
    theme: Theme;
    activeTab: string
    tabs: Tabs
    panels:Panels
    activeViewport: string;
    viewportManager: viewportManagerState
  }

export interface RibbonTab {
  name: string;
  type: "dropdown" | "base"
  label: string;
  active: true;
  loaded?: boolean;
  sections: Array<React.ReactNode>;
}

export const layoutInitialState: LayoutState = {
  theme: "light",
  activeTab: 'file',
  tabs: {
    file: {
      name: 'file',
      type: 'dropdown',
      active: true,
      label: 'Arquivo',
      loaded: true
    }
  },
  panels: {
    settings: {open: true, title: 'Configurações'},
    details: {open: false, title: 'Detalhes'}
  },
  activeViewport: 'home',
  viewportManager: {
    groups: {},
    viewports: {
      home: {
        name: 'home',
        title: "",
        type: 'home'
      }
    }
  }
};
