
import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";
import { CompoundValue } from "@system/modules/Converter/typings";

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

export type MaterialNode = Node & {
    type: "MATERIAL";
    label: string;
    materialId: number;
    attributes?: {}
        
}

export type ElectiveNode = Node & {
    type: "ELECTIVE";
    label: string;
    electiveId: string; // small hash id
    value?: boolean;
    defaultValue?: boolean;
}

export type ProcessNode = Node & {
    type: "PROCESS";
    label: string;
    processId: string; // small hash id
    costMoney?: CompoundValue; // monetary cost as CompoundValue (use Converter CompoundValue)
    costTime?: CompoundValue; // compound time value (quotient/dividend from Converter)
}

// edges definitions
export type HasPartEdge = Edge & {
    type: "HAS_PART";
}
export type PartOfEdge = Edge & {
    type: "PART_OF";
}
export type MaterialOfEdge = Edge & {
    type: "MATERIAL_OF";
}
export type  HasMaterialEdge = Edge & {
    type: "HAS_MATERIAL";
} 
export type HasElectiveEdge = Edge & {
    type: "HAS_ELECTIVE";
}
export type ElectiveOfEdge = Edge & {
    type: "ELECTIVE_OF";
}
export type HasProcessEdge = Edge & {
    type: "HAS_PROCESS";
}
export type ProcessOfEdge = Edge & {
    type: "PROCESS_OF";
}
export type ConsumesEdge = Edge & {
    type: "CONSUMES";
    // amount stored on the edge
    amount?: CompoundValue;
}
export type ConsumedByEdge = Edge & {
    type: "CONSUMED_BY";
    // amount stored on the reverse edge as well
    amount?: CompoundValue;
}
export type VariationGraphState = GraphState & {
    nodes: {
        [key: string]: GarmentNode | PartNode | MaterialNode | ElectiveNode | ProcessNode;
    };
    edges: {
        [key: string]: HasPartEdge | PartOfEdge | MaterialOfEdge | HasMaterialEdge | HasElectiveEdge | ElectiveOfEdge | HasProcessEdge | ProcessOfEdge | ConsumesEdge | ConsumedByEdge;
    };
}