import { MannequinProperties } from "../Mannequin";

export interface MannequinChangedEvent {
  graphId: string;
  oldAttributes: MannequinProperties;
  newAttributes: MannequinProperties;
}
