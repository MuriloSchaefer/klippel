import { MannequinAttributes } from "../../../../interfaces/Mannequin";

export interface MannequinChangeEvent {
  oldAttributes: MannequinAttributes;
  newAttributes: MannequinAttributes;
}
