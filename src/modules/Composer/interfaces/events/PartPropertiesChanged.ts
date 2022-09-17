import { Properties } from "../Material";

export interface PropertiesChangedEvent {
  graphId: string;
  materialId: string;
  oldProperties: Properties;
  newProperties: Properties;
}
