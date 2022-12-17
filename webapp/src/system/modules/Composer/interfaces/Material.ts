import { Node } from "@kernel/modules/Graphs/interfaces/Node";

export interface Property {
  value: string;
  type: string;
}

export interface Material extends Node {
  type: "Material";
  properties: Properties;
}

export interface Properties {
  [name: string]: Property;
}

export default Material;
