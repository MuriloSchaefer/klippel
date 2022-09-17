import { Composition } from "../Composition";
import { Material } from "../Material";

export interface MaterialSelectedEvent {
  material: Material | Composition;
}
