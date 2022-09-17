import { GraphState } from "@kernel/modules/GraphsManager/store/state";
import { Composition } from "../interfaces/Composition";
import { Material } from "../interfaces/Material";

export interface CompositionGraphState extends GraphState {
  nodes: {
    [id: string]: Composition | Material;
  };
}

export interface UIState {
  leftPanel: Record<string, never>;
  rightPanel: {
    selectedMaterialId: string | null; // null means no part is selected
  };
  viewport: {
    loadingSVG: boolean;
    parsing: {
      garment: boolean;
      mannequin: boolean;
      annotations: boolean;
    };
    graphId: string | null; // null means no graph is available
  };
}
