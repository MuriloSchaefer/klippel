import { GraphState } from "@kernel/modules/GraphsManager/store/state";
import { Composition } from "../interfaces/Composition";
import { MannequinLayer } from "../interfaces/Mannequin";
import { Part, PartsLayer } from "../interfaces/Part";

export interface CompositionGraphState extends GraphState {
  nodes: {
    partsLayer: PartsLayer;
    mannequinLayer: MannequinLayer;
    [id: string]: Composition | MannequinLayer | PartsLayer | Part;
  };
}

export interface UIState {
  leftPanel: {
    isOpen: boolean;
  };
  rightPanel: {
    isOpen: boolean;
    selectedPartId: string | null; // null means no part is selected
  };
  viewport: {
    loadingSVG: boolean;
    parsing: {
      parts: boolean;
      mannequin: boolean;
      annotations: boolean;
    };
    graphId: string | null; // null means no graph is available
  };
}
