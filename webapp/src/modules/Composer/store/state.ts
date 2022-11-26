import { GraphState } from "@kernel/modules/GraphsModule/store/state";
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

type loadingStatus = "not-started" | "started" | "finished"

export interface ComposerViewportUI {
  UI: {
    settingsPanel: Record<string, never>;
    detailsPanel: {
      selectedMaterialId: string | null; // null means no part is selected
    };
    loaders: {
      loadSVG: loadingStatus,
      parseSVG: {
        garment: loadingStatus,
        mannequin: loadingStatus,
        annotations: loadingStatus,
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
