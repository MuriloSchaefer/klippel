import { GraphState } from "@kernel/modules/GraphsManager/store/state";
import Composition from "../interfaces/Composition";
import { MannequinLayer } from "../interfaces/Mannequin";

export interface CompositionGraphState extends GraphState {
  nodes: { [id: string]: Composition; mannequinLayer: MannequinLayer };
}
