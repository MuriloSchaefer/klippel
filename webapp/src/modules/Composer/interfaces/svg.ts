import Node from "@kernel/modules/GraphsModule/interfaces/Node";

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
