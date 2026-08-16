export const MODULE_NAME: "Composer" = 'Composer'
export const MODULE_VERSION = '0.0.1'

// Canonical root garment node id, created with every variation (see
// store/models/middlewares.ts). Electives only ever link to this node today —
// sub-part electives are not yet designed.
export const GARMENT_ROOT_ID = "garment";

/**
 * Component registry namespace for accordions other modules want to mount in
 * the ModelViewport settings panel, after Composer's own ones. Composer cannot
 * import those modules — they depend on Composer, not the other way round — so
 * they register into this instead. Same shape as Layout's `systemTray`.
 *
 * Entries receive `{ variationId, modelId }` and own their `<Accordion>`.
 */
export const MODEL_VIEWPORT_SETTINGS_REGISTRY_NAME = "composerModelViewportSettings";

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
export const DOCUMENT_LIST_CONTEXT_ID = `${MODULE_NAME}/DocumentList`;
