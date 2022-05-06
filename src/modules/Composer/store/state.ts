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
