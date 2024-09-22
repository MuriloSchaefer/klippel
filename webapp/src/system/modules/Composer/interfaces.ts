import { Node } from "@kernel/modules/Graphs/interfaces/Node";

export type Product = {
  name: string,
  id: number,
  rootFolder: string,
  description: string
}

export type CompositionInfo = {
  readonly graphId: string;
  readonly selectedPart: string;
  readonly compositionName: string;
}

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
