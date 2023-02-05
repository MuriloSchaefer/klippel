import { Node } from "@kernel/modules/Graphs/interfaces/Node";

export interface Property {
  value: string;
  type: string;
}

export interface Part extends Node {
  type: "Part";
  properties: Properties;
}

export interface Properties {
  [name: string]: Property;
}

export default Part;
