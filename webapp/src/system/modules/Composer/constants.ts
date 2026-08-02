export const MODULE_NAME: "Composer" = 'Composer'
export const MODULE_VERSION = '0.0.1'

// Canonical root garment node id, created with every variation (see
// store/models/middlewares.ts). Electives only ever link to this node today —
// sub-part electives are not yet designed.
export const GARMENT_ROOT_ID = "garment";

export const MODEL_SELECTION_MODAL_CONTEXT_ID = `${MODULE_NAME}/ModelSelectionModal`;
export const CONFIRM_MODEL_SELECTION_SHORTCUT_ID = `${MODEL_SELECTION_MODAL_CONTEXT_ID}/confirm`;

export const MATERIAL_LIST_CONTEXT_ID = `${MODULE_NAME}/MaterialList`;
export const GRADUATION_LIST_CONTEXT_ID = `${MODULE_NAME}/GraduationList`;
export const VISUALIZATION_LIST_CONTEXT_ID = `${MODULE_NAME}/VisualizationList`;
export const ELECTIVE_LIST_CONTEXT_ID = `${MODULE_NAME}/ElectiveList`;
export const PROCESS_LIST_CONTEXT_ID = `${MODULE_NAME}/ProcessList`;
export const PROCESS_TIME_LIST_CONTEXT_ID = `${MODULE_NAME}/ProcessTimeList`;
export const SVG_EMPTY_STATE_CONTEXT_ID = `${MODULE_NAME}/SVGEmptyState`;
export const UPLOAD_SVG_SHORTCUT_ID = `${SVG_EMPTY_STATE_CONTEXT_ID}/uploadSVG`;

export const LOGO_LIST_CONTEXT_ID = `${MODULE_NAME}/LogoList`;
// Active only while the placements pointer is open (pushed/popped on its mount).
export const LOGO_PLACEMENTS_CONTEXT_ID = `${MODULE_NAME}/LogoPlacements`;

export const ANNOTATION_LIST_CONTEXT_ID = `${MODULE_NAME}/AnnotationList`;