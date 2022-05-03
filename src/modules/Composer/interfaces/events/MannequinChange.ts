import { MannequinAttributes } from "../Mannequin";

export interface MannequinChangeEvent {
  graphId: string;
  oldAttributes: MannequinAttributes;
  newAttributes: MannequinAttributes;
}
