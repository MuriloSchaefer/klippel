
import Edge from "@kernel/modules/Graphs/interfaces/Edge";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";
import { CompoundValue, UnitValue } from "@system/modules/Converter/typings";
import { MaterialState } from "@system/modules/Materials/store/materials/state";

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
  // True when the session SVG has not yet been pushed to Jazz. Set on
  // uploadSVG, cleared on modelSaved after the Save button persists.
  svgDirty?: boolean
}

export type ComposerModuleState = {
    models: { [key: string]: Model },
    variations: { [key: string]: ModelVariation }
}

// ---------------------------------------------------------------------------
// Jazz wire types — DTOs that cross IPC between renderer and main process.
// Kept in Composer so the kernel's main-process layer
// (`electron/main/jazz.ts`) and preload bridge stay free of Composer-internal
// shape definitions.
// ---------------------------------------------------------------------------

export type ModelSummary = {
    id: string;
    coId: string;
    name: string;
    description: string;
    hasSvg: boolean;
    updatedAt: number;
}

export type EditLeaseSnapshot = {
    holderAccountId: string;
    acquiredAt: number;
    expiresAt: number;
}

export type LoadedModel = ModelSummary & {
    graphJson: string;
    editLease?: EditLeaseSnapshot;
}

export type CreateModelInput = {
    id: string;
    name: string;
    graphJson: string;
    description?: string;
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
    materialId: string;
    // Cached snapshot of the catalog material at the time the node was added
    // or last refreshed. Lets the accordion render before/without the
    // Materials redux slice being available (e.g. when loading a .session).
    materialSnapshot?: MaterialState;
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
    // JSON snapshot of the costTime that produced the current computedTimePerUnit.
    // Mismatch with the current costTime means a recompute is pending and any
    // computedTimePerUnit / timeAudit value is stale.
    computedTimeFromCostTimeHash?: string;
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

// --- Logos (embroidery / silk-screen) ---------------------------------------

export type LogoMethod = "embroidery" | "silkscreen";

export type LogoPlacement = {
    placementId: string;                 // small hash, unique within the logo
    name: string;                        // user-facing, e.g. "Manga direita"
    master?: boolean;                    // marks the auto-created placement; descriptive only — NOT delete-protected
    size: { width: UnitValue; height: UnitValue }; // PHYSICAL size of THIS placement; drives its cost
    costExpression?: string;             // numeric expression over { colors, width, height, methodFactor, gradesTotal }; priced PER placement
    transform: { x: number; y: number; rotation: number; scale: number }; // position + rotation (deg) + VISUAL scale
    clipTargetId?: string;               // id of the SVG element to clip into
}

export type LogoSource =
    | { kind: "svg"; documentId: string }                       // → DOCUMENT node holding sanitized markup, injected as <symbol>
    | { kind: "raster"; documentId: string; pendingVector: boolean }; // → DOCUMENT node holding quantized image, injected as <image>

export type LogoPlacementCostAudit = {
    placementId: string;
    name: string;
    size: { width: UnitValue; height: UnitValue };
    skipped: boolean;
    skipReason?: string;
    attributeNormalisations: AttributeNormalisationAudit[];
    context: { [name: string]: number };  // substituted inputs (colors/width/height/methodFactor/gradesTotal)
    expression?: string;
    cost: number;
}

export type LogoCostAudit = {
    computedAt: string;
    skipped: boolean;                    // whole-logo elective gate
    skipReason?: string;
    methodFactor: number;
    gradesTotal: number;
    gradesBreakdown: { graduationId: string; label: string; amount: number }[];
    placements: LogoPlacementCostAudit[];
    total: number;                       // per-unit cost (Σ placement costs)
    garmentTotal: number;                // per-unit cost × gradesTotal (whole-garment cost)
}

// The "main copy": a draggable/resizable overlay on top of the editor (DOM
// layer, screen/editor-pixel space — does NOT zoom with the drawing). Move +
// resize only (no rotation). It is the staging source, not a costed placement.
export type LogoMainCopy = {
    x: number;       // px from the editor wrapper's top-left
    y: number;
    width: number;   // px
    height: number;  // px (aspect-locked to the art)
}

export type LogoNode = Node & {
    type: "LOGO";
    label: string;
    logoId: string;                      // small hash
    method: LogoMethod;
    colors: number;
    defaultSize: { width: UnitValue; height: UnitValue }; // seeds new placements
    source: LogoSource;
    mainCopy?: LogoMainCopy;             // overlay staging copy (drag/resize, no rotation)
    electiveNodeId?: string;             // optional elective gate (same field as ProcessNode)
    computedCost?: CompoundValue;        // per-unit cost; written back by the middleware's bulk LOGO loop
    computedTotal?: CompoundValue;       // whole-garment cost (per-unit × gradesTotal); written back by the bulk LOGO loop
    costAudit?: LogoCostAudit;
    placements: LogoPlacement[];         // in-content placements (scale/move/rotate/clip); may be empty
}

// --- Annotations (text notes pinned to the drawing) -------------------------

// A free-text note rendered inside the editor SVG (user-space, so it zooms/pans
// and is included in SVG exports). A leader line connects a draggable target
// point on the drawing to the label. Purely informational — no cost.
export type AnnotationNode = Node & {
    type: "ANNOTATION";
    label: string;                 // short title shown in the accordion row
    annotationId: string;          // small hash
    text: string;                  // plain-text body; rendered as SVG <text>/<tspan>
    target: { x: number; y: number };               // leader origin, SVG user-space
    transform: { x: number; y: number; scale: number }; // label position + scale (no rotation)
    electiveNodeId?: string;       // optional elective gate (same field/pattern as LogoNode)
}

// Generic blob storage node. Holds draw-view SVGs, plotter files, orders,
// receipts, etc. — this change implements only the minimum needed for logos
// while leaving the type open to other kinds.
export type DocumentNode = Node & {
    type: "DOCUMENT";
    documentId: string;                  // small hash; referenced by LogoSource.documentId
    kind: string;                        // open discriminator — "logo-svg" | "logo-raster" now
    mime: string;                        // e.g. "image/svg+xml", "image/png"
    filename?: string;                   // original upload name
    encoding: "base64";                  // only encoding for now
    data: string;                        // base64-encoded blob content
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
export type HasLogoEdge = Edge & {
    type: "HAS_LOGO";
}
export type LogoOfEdge = Edge & {
    type: "LOGO_OF";
}
export type HasAnnotationEdge = Edge & {
    type: "HAS_ANNOTATION";
}
export type AnnotationOfEdge = Edge & {
    type: "ANNOTATION_OF";
}
export type HasDocumentEdge = Edge & {
    type: "HAS_DOCUMENT";
}
export type DocumentOfEdge = Edge & {
    type: "DOCUMENT_OF";
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
        [key: string]: GarmentNode | PartNode | MaterialNode | ElectiveNode | ProcessNode | VisualizationNode | GraduationNode | LogoNode | DocumentNode;
    };
    edges: {
        [key: string]: HasPartEdge | PartOfEdge | MaterialOfEdge | HasMaterialEdge | HasElectiveEdge | ElectiveOfEdge | HasProcessEdge | ProcessOfEdge | ConsumesEdge | ConsumedByEdge | HasVisualizationEdge | VisualizationOfEdge | HasGraduationEdge | GraduationOfEdge | HasLogoEdge | LogoOfEdge | HasDocumentEdge | DocumentOfEdge;
    };
}