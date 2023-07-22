import { PaletteMode } from "@mui/material";
import {initialState as panelsInitialState, PanelsState} from "./panels/state";
import { RibbonMenuState } from "./ribbonMenu/state";
import { viewportManagerState } from "./viewports/state";

export type Theme = PaletteMode;

export interface LayoutState {
  theme: Theme;
  ribbonMenu: RibbonMenuState;
  panels: PanelsState;
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
  panels: panelsInitialState,
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
