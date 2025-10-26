
import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";

import type { CompoundValue, UnitValue } from "@system/modules/Converter/typings";

export type Model = {
    id: string,
    name: string,
    svg?: string,
    graph: string,
    description: string
}

export type ModelVariation = Model & {
  variationId: string 
  instanceId: string // in memory id, used for graphId, svgId. Overwriten when loading from disk
  selectedPart: string
}

export type ComposerModuleState = {
    models: { [key: string]: Model },
    variations: { [key: string]: ModelVariation }
}


// nodes definitions
export type GarmentNode = Node & {
    type: "GARMENT";
    label: string;
    description: string;
}
export type PartNode = Node & {
    type: "PART";
    label: string;
}

// edges definitions
export type HasPartEdge = Edge & {
    type: "HAS_PART";
}
export type PartOfEdge = Edge & {
    type: "PART_OF";
}