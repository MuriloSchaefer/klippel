import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";

import type { CompoundValue } from "@system/modules/Converter/typings";

export interface MaterialTypeNode extends Node {
  type: "MATERIAL_TYPE";
  label: string;
}
export interface GarmentNode extends Node {
  type: "GARMENT";
  label: string;
  description: string;
}
export interface GradeNode extends Node {
  type: "GRADE";
  abbreviation: string;
}
export interface PartNode extends Node {
  type: "PART";
  label: string;
  domId?: string;
}
export interface Proxy {
  elem: string;
  attr: string;
}
export interface MaterialUsageNode extends Node {
  type: "MATERIAL_USAGE";
  label: string;
  editableAttributes: string[];
  materialId: string; // TODO: add typing
  materialType: string;
  proxies: Proxy[];
}

export interface MaterialNode extends Node {
  type: "MATERIAL";
  label: string;
  materialId: number; // TODO: add typing
}
export interface OperationNode extends Node {
  type: "OPERATION";
  label: string;
  time_taken: CompoundValue;
  cost: CompoundValue;
}

export type RestrictionNode = AllowOnlyRestrictionNode | SameAsRestrictionNode;
export interface AllowOnlyRestrictionNode<T = string> extends Node {
  type: "RESTRICTION";
  label: string;
  attribute: string;
  restrictionType: "allowOnly";
  operand: T[];
}
export interface SameAsRestrictionNode<T = string> extends Node {
  type: "RESTRICTION";
  label: string;
  attribute: string;
  restrictionType: "sameAs";
  operand: T;
}

export type CompositionNode =
  | GarmentNode
  | MaterialTypeNode
  | PartNode
  | MaterialUsageNode
  | RestrictionNode
  | MaterialNode
  | GradeNode;

export interface ComposedOfEdge extends Edge {
  type: "COMPOSED_OF";
}

export interface HasGradeEdge extends Edge {
  type: "HAS_GRADE";
  order: number
}

export interface MadeOfEdge extends Edge {
  type: "MADE_OF";
}
export interface RestrictedByEdge extends Edge {
  type: "RESTRICTED_BY";
  attr: string;
}
export interface ProcessNeededEdge extends Edge {
  type: "PROCESS_NEEDED";
}
export interface ConsumesEdge extends Edge {
  type: "CONSUMES";
  quantity: CompoundValue
}

export type CompositionEdge =
  | ComposedOfEdge
  | RestrictedByEdge
  | MadeOfEdge
  | ProcessNeededEdge
  | ConsumesEdge
  | HasGradeEdge;

export type CompositionGraph = GraphState<CompositionNode, CompositionEdge>;

type Loader = "not-started" | "started" | "completed";

export type BudgetInfo = {
  budgetId: string
  grades: {
    [name: string]: number
  }
}
export interface CompositionState {
  name: string;
  viewportName: string;
  svgPath: string;
  descriptionPath?: string;
  graphId: string;
  selectedPart?: string;
  debugViewport?: string;
  loading: {
    loadSVG: Loader;
    loadModel: Loader;
  };
  budget: BudgetInfo | undefined
}

export const newCompositionState: Omit<
  CompositionState,
  "name" | "viewportName" | "svgPath" | "graphId"
> = {
  loading: {
    loadSVG: "not-started",
    loadModel: "not-started",
  },
  selectedPart: undefined,
  budget: undefined
};
