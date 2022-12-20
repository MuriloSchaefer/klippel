import { GraphState } from "@kernel/modules/Graphs/store/state";
import { Composition } from "../interfaces/Composition";
import { Material } from "../interfaces/Material";

export interface CompositionGraphState extends GraphState {
  nodes: {
    [id: string]: Composition | Material;
  };
}

export interface ShortcutsState {
  id: string;
  nodeId?: string;
}

type LoadingStatus = "not-started" | "started" | "finished"

export interface ComposerViewportUI {
  UI: {
    settingsPanel: Record<string, never>;
    detailsPanel: {
      selectedMaterialId: string | null; // null means no part is selected
    };
    loaders: {
      loadSVG: LoadingStatus,
      parseSVG: {
        garment: LoadingStatus,
        mannequin: LoadingStatus,
        annotations: LoadingStatus,
      }
    }
    shortcuts: ShortcutsState
  }
  viewportId: string;
  svgPath: string;
  graphId: string; 
}

export interface UIState {
  
  viewports: {
    [id: string]: ComposerViewportUI
  };
}
