
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

export type AttributeAudit = {
  name: string;
  rawValue: unknown;
  rawUnit?: string;
  normalisedValue?: number;
  normalisedUnit?: string;
  wasNormalised: boolean;
  injectedVariables?: { [varName: string]: number };
};

export type AttributeNormalisationAudit = {
  attributeName: string;
  originalValue: number;
  originalUnit: string;
  normalisedValue: number;
  normalisedUnit: string;
};

export type ConversionStepAudit = {
  fromUnit: string;
  toUnit: string;
  expression: string;
  attributeValues: { [varName: string]: number };
  quantityValues: { [varName: string]: number };
  result: number;
};

export type GraduationBreakdownEntry = {
  graduationId: string;
  graduationLabel: string;
  garmentAmount: number;
  consumption: CompoundValue;
  gradeDelta?: number;
  convertedAmount: number;
  contribution: number;
};

export type ProcessStepAudit = {
  processLabel: string;
  skipped: boolean;
  skipReason?: string;
  originalAmount: CompoundValue;
  attributeNormalisations: AttributeNormalisationAudit[];
  conversionSteps: ConversionStepAudit[];
  convertedAmount: number;
  convertedUnit: string;
  runningTotal: number;
  error?: string;
  graduationBreakdown?: GraduationBreakdownEntry[];
};

export type CostAudit = {
  computedAt: string;
  materialAttributes: AttributeAudit[];
  steps: ProcessStepAudit[];
};

export type PlannedConversionStep = {
  fromUnit: string;
  toUnit: string;
  expression: string;
};

export type ProcessTimeAudit = {
  computedAt: string;
  processLabel: string;
  rawCostTime: CompoundValue | undefined;
  attributeNormalisations: AttributeNormalisationAudit[];
  initialContext?: { [name: string]: number };
  plannedSteps?: PlannedConversionStep[];
  conversionSteps: ConversionStepAudit[];
  fallback?: {
    reason: string;
    rawDividendAmount: number;
    rawQuotientAmount: number;
    resultMinutesPerUnit: number;
  };
  error?: string;
  result?: { amount: number; unit: string };
};

export type GraduationProcessTimeAudit = {
  computedAt: string;
  graduationLabel: string;
  graduationAmount: number;
  perProcessContributions: {
    processId: string;
    processLabel: string;
    minutesPerUnit: number;
  }[];
  totalMinutesPerUnit: number;
  result: { amount: number; unit: string };
};

export type MaterialNode = Node & {
    type: "MATERIAL";
    label: string;
    materialId: number;
    attributes?: {}
    typeRestrictions: string[];
    computedCost?: CompoundValue;
    computedTotal?: CompoundValue; // grade-aware aggregated total (Σ_g graduation.amount × consumption_g)
    costAudit?: CostAudit;
}

export type ElectiveNode = Node & {
    type: "ELECTIVE";
    label: string;
    electiveId: string; // small hash id
    value?: boolean;
    defaultValue?: boolean;
}

export type GraduationNode = Node & {
    type: "GRADUATION";
    label: string;
    graduationId: string; // small hash id
    order?: number; // ordering index within garment
    amount?: number; // number of garments for this graduation
    computedProcessTime?: { amount: number; unit: string };
    processTimeAudit?: GraduationProcessTimeAudit;
}

export type ProcessNode = Node & {
    type: "PROCESS";
    label: string;
    processId: string; // small hash id
    costMoney?: CompoundValue; // monetary cost as CompoundValue (use Converter CompoundValue)
    costTime?: CompoundValue; // compound time value (quotient/dividend from Converter)
    electiveNodeId?: string; // optional reference to an elective node - if set, process only applies when elective.value is true
    computedTimePerUnit?: { amount: number; unit: string };
    timeAudit?: ProcessTimeAudit;
}

export type VisualizationDom = {
    id: string;
    fill?: boolean;
    stroke?: boolean;
}

export type VisualizationNode = Node & {
    type: "VISUALIZATION";
    label: string;
    visualizationId: string; // small hash id
    materialNodeId: string; // node id of the MATERIAL node this visualization references
    doms: VisualizationDom[]; // list of SVG element ids and per-entry options
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
export type HasGraduationEdge = Edge & {
    type: "HAS_GRADUATION";
}
export type GraduationOfEdge = Edge & {
    type: "GRADUATION_OF";
}
export type HasVisualizationEdge = Edge & {
    type: "HAS_VISUALIZATION";
}
export type VisualizationOfEdge = Edge & {
    type: "VISUALIZATION_OF";
}
export type ConsumesEdge = Edge & {
    type: "CONSUMES";
    // default consumption (baseline) used when a graduation has no explicit override
    amount: CompoundValue;
    // explicit consumption per graduation (authoritative when present)
    consumptionPerGrade?: { [graduationNodeId: string]: CompoundValue };
    // signed % delta vs amount; persisted but read-only — managed by variation actions
    gradeDeltas?: { [graduationNodeId: string]: number };
}
export type ConsumedByEdge = Edge & {
    type: "CONSUMED_BY";
    amount: CompoundValue;
    consumptionPerGrade?: { [graduationNodeId: string]: CompoundValue };
    gradeDeltas?: { [graduationNodeId: string]: number };
}
export type VariationGraphState = GraphState & {
    nodes: {
        [key: string]: GarmentNode | PartNode | MaterialNode | ElectiveNode | ProcessNode | VisualizationNode | GraduationNode;
    };
    edges: {
        [key: string]: HasPartEdge | PartOfEdge | MaterialOfEdge | HasMaterialEdge | HasElectiveEdge | ElectiveOfEdge | HasProcessEdge | ProcessOfEdge | ConsumesEdge | ConsumedByEdge | HasVisualizationEdge | VisualizationOfEdge | HasGraduationEdge | GraduationOfEdge;
    };
}