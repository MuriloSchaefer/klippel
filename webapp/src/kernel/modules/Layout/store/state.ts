import { PaletteMode } from "@mui/material";
import { RibbonMenuState, Tabs } from "./ribbonMenu/state";
import { viewportManagerState } from "./viewports/state";

export type Theme = PaletteMode;

export interface PanelState {
  open: boolean;
  title: string;
}
export interface Panels {
  settings: PanelState;
  details: PanelState;
}

export interface LayoutState {
  theme: Theme;
  ribbonMenu: RibbonMenuState;
  panels: Panels;
  viewportManager: viewportManagerState;
}

export const layoutInitialState: LayoutState = {
  theme: "light",
  ribbonMenu: {
    activeTab: "file",
    tabs: {
      file: {
        name: "file",
        type: "dropdown",
        active: true,
        label: "Arquivo",
        loaded: true,
        sectionNames: []
      },
    },
  },
  panels: {
    settings: { open: true, title: "Configurações" },
    details: { open: false, title: "Detalhes" },
  },
  viewportManager: {
    activeViewport: "home",
    groups: {},
    viewports: {
      home: {
        name: "home",
        title: "",
        type: "home",
      },
    },
  },
};
