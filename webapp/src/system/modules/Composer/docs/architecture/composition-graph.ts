/**
 * @fileoverview Composition Graph — structure and conventions.
 *
 * The composition graph is the core data model of the Composer module. It is a
 * directed graph stored in Redux (via the kernel Graph module) under the key equal
 * to the variation's `instanceId`. Every garment variation owns exactly one graph.
 *
 * Graph state is persisted to disk as part of the session and loaded back via
 * `loadGraph` when a variation is opened. The kernel Graph module provides all
 * CRUD operations through a command/event action pair pattern; Composer-specific
 * semantics are layered on top through typed node and edge definitions in
 * `../typings.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NODE TYPES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * GarmentNode  { type: "GARMENT" }
 *   Root of the graph. Every variation has exactly one GarmentNode.
 *   Fields: label, description.
 *
 * PartNode  { type: "PART" }
 *   A physical section of the garment (e.g. "frente", "costa").
 *   Connected to GarmentNode via HAS_PART / PART_OF edges.
 *   Fields: label.
 *
 * MaterialNode  { type: "MATERIAL" }
 *   Represents a material assignment on a part. References a Material record by
 *   `materialId`. Optional `attributes` override default material properties for
 *   conversion purposes (e.g. width, grammage). `typeRestrictions` constrains
 *   which material types are valid for this slot.
 *   Connected to PartNode via HAS_MATERIAL / MATERIAL_OF edges.
 *   Fields: label, materialId, attributes?, typeRestrictions[].
 *
 * ElectiveNode  { type: "ELECTIVE" }
 *   A boolean toggle that enables or disables a group of processes. When
 *   `value` is false (or undefined), all ProcessNodes referencing this elective
 *   via `electiveNodeId` are skipped in cost computation.
 *   Fields: label, electiveId, value?, defaultValue?.
 *
 * ProcessNode  { type: "PROCESS" }
 *   A manufacturing operation that consumes material. Each ProcessNode may have
 *   a direct monetary cost (`costMoney`) and a time cost (`costTime`) stored as
 *   CompoundValues (ratio of two unit quantities, e.g. R$/m²). Optionally tied
 *   to an ElectiveNode via `electiveNodeId`.
 *   Connected to MaterialNode via CONSUMES / CONSUMED_BY edges.
 *   Fields: label, processId, costMoney?, costTime?, electiveNodeId?.
 *
 * GraduationNode  { type: "GRADUATION" }
 *   Represents a sizing graduation applied to the garment. `order` controls the
 *   display sequence within the garment.
 *   Fields: label, graduationId, order?.
 *
 * VisualizationNode  { type: "VISUALIZATION" }
 *   Maps a MaterialNode to one or more SVG DOM elements for live preview. Each
 *   entry in `doms` can independently toggle fill and/or stroke rendering.
 *   Fields: label, visualizationId, materialNodeId, doms[].
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EDGE TYPES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Structural edges (no payload beyond source/target):
 *   HAS_PART / PART_OF            — GarmentNode ↔ PartNode
 *   HAS_MATERIAL / MATERIAL_OF    — PartNode ↔ MaterialNode
 *   HAS_ELECTIVE / ELECTIVE_OF    — (parent) ↔ ElectiveNode
 *   HAS_PROCESS / PROCESS_OF      — MaterialNode ↔ ProcessNode
 *   HAS_GRADUATION / GRADUATION_OF — GarmentNode ↔ GraduationNode
 *   HAS_VISUALIZATION / VISUALIZATION_OF — MaterialNode ↔ VisualizationNode
 *
 * Semantic edges (carry payload):
 *   ConsumesEdge   { type: "CONSUMES",     source: ProcessNode, target: MaterialNode }
 *     `amount: CompoundValue` — how much of the material this process consumes
 *     (e.g. 1.2 m² per unit). This is the primary input to cost computation.
 *   ConsumedByEdge { type: "CONSUMED_BY",  source: MaterialNode, target: ProcessNode }
 *     Reverse of ConsumesEdge; carries the same `amount` for bidirectional traversal.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UPDATE MECHANISM
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * All writes go through the kernel Graph module's command/event action pairs:
 *
 *   addNode / nodeAdded
 *   removeNode / nodeRemoved
 *   updateNode / nodeUpdated      — accepts `changes: Partial<Node>`
 *   addEdge / edgeAdded
 *   removeEdge / edgeRemoved
 *   updateEdge / edgeUpdated
 *   loadGraph / graphLoaded
 *
 * A Redux listener middleware intercepts every command, executes any side
 * effects (e.g. BFS/DFS search caching), then dispatches the corresponding
 * event. Reducers update state only on events. Components subscribe via
 * `useGraph(variationId, selector)`, which memoises the selection to avoid
 * unnecessary re-renders.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PLANNED CHANGES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * - Cache material cost computation in the graph node:
 *   `./changes/cache-cost-computation.md`
 */

export {};
