import Node from "@kernel/modules/Graphs/interfaces/Node";

export type SVGTag =
  | "xml"
  | "DOCTYPE"
  | "svg"
  | "defs"
  | "font"
  | "style"
  | "g"
  | "mask"
  | "use"
  | string;

export interface SVGNode extends Node {
  tag: SVGTag;
  properties: any;
}

export default SVGNode;
