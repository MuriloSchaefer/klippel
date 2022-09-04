import { Composition } from "../Composition";
import { Part } from "../Part";

export interface PartSelectedEvent {
  part: Part | Composition;
}
