import Node from "@kernel/modules/GraphsManager/interfaces/Node";

type Part = Node;
export type PartLayer = Node;

export interface PartAttributes extends Node {
  color: string;
  material?: string;
}

export default Part;
