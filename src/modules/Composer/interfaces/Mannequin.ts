import Node from "@kernel/modules/GraphsManager/interfaces/Node";

export type MannequinView = Node;
export type MannequinLayer = Node;

export interface MannequinAttributes extends Node {
  skinColor: string;
}
