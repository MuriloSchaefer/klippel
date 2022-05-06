import { PartProperties } from "../Part";

export interface PartPropertiesChangedEvent {
  graphId: string;
  partId: string;
  oldProperties: PartProperties;
  newProperties: PartPropertiesChangedEvent;
}
