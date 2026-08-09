import { co, z, Group } from "jazz-tools";

export const WorkspaceMetadata = co.map({
  name: z.string(),
  createdAt: z.number(),
  ownerAccountId: z.string(),
  syncOptIn: z.boolean(),
  disallowRelay: z.boolean(),
  syncUrl: z.string().optional(),
});

/**
 * EditLease — single-writer coordination for `ModelCoMap.graphJson`.
 *
 * Atomic-string fields are last-writer-wins, so two peers editing the same
 * model would silently lose one set of changes. The lease gates writes to
 * `graphJson`: only the current holder may mutate it. Enforcement lives in
 * the main-process middleware and (Phase 6) the receive-validator.
 *
 * TTL is 60s by default; the editor renews on focus and releases on close.
 */
export const EditLease = co.map({
  holderAccountId: z.string(),
  acquiredAt: z.number(),
  expiresAt: z.number(),
});

/**
 * ModelCoMap — one model.
 *
 * `graphJson` is stored as an atomic string per the plan's perf guidance
 * (graphs are loaded/saved as a whole; per-node CRDTs would bloat history).
 * Concurrent-write hazard is mitigated by `editLease`.
 *
 * `svg` is a BinaryCoStream so blob sync is native to Jazz; the renderer
 * fetches and sanitizes the bytes before mounting.
 */
export const ModelCoMap = co.map({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  graphJson: z.string(),
  svg: co.optional(co.fileStream()),
  editLease: co.optional(EditLease),
  updatedAt: z.number(),
});

export const ModelsMap = co.record(z.string(), ModelCoMap);

/**
 * ModelSummary — denormalized projection of a single `ModelCoMap` carrying
 * only the fields the model-list UI renders. `listModels` walks summaries
 * instead of deep-resolving every `ModelCoMap` (which drags `graphJson`,
 * `editLease`, and the SVG ref through the sync manager on every IPC call).
 *
 * Kept in lockstep with the parent `ModelCoMap` by main-process mutators
 * (`createModel`, `updateModelGraph`, `updateModelDescription`,
 * `uploadModelSvg`). `modelCoId` is the canonical pointer used by
 * `loadModel` to resolve the full body directly.
 *
 * Rationale: jazz-performance.md §2.2 (action item #1).
 */
export const ModelSummary = co.map({
  id: z.string(),
  modelCoId: z.string(),
  name: z.string(),
  description: z.string(),
  updatedAt: z.number(),
  hasSvg: z.boolean(),
});

export const ModelSummariesMap = co.record(z.string(), ModelSummary);

/**
 * Materials catalog — per-CoValue graph.
 *
 * Diverges from `ModelCoMap.graphJson` (one atomic blob behind an
 * `EditLease`). The catalog is long-lived shared state edited
 * concurrently at attribute granularity; every node, edge, and
 * attribute is its own CoValue so per-cell CRDTs let parallel edits
 * merge with no lease. See
 * `system/modules/Materials/docs/architecture/graph-semantics.md`.
 */
export const NodePosition = co.map({ x: z.number(), y: z.number() });

// One attribute cell — its own CoValue, so users editing different
// attributes of the same material never collide. Object-typed
// attributes recurse through `children`.
export const AttributeCoMap = co.map({
  key: z.string(),
  valueJson: z.optional(z.string()),
  get children() {
    return co.optional(co.record(z.string(), AttributeCoMap));
  },
});

// stock — its own CoMap; `amount` / `unit` are independent CRDT registers.
export const StockCoMap = co.map({ amount: z.number(), unit: z.string() });

export const AttributeRecord = co.record(z.string(), AttributeCoMap);

export const MaterialCoMap = co.map({
  id: z.string(),
  type: z.string(),
  label: z.optional(z.string()),
  position: NodePosition,
  attributes: AttributeRecord,
  stock: StockCoMap,
  composition: co.optional(AttributeRecord),
  caracteristics: co.optional(AttributeRecord),
  externalId: z.optional(z.string()),
  externalURL: z.optional(z.string()),
  // Single supplier image (product photo / swatch). One field rather than a
  // list because `co.list` would make it a separate CRDT node for something
  // that is always replaced wholesale, never edited concurrently.
  imageURL: z.optional(z.string()),
  description: z.optional(z.string()),
  schemaVersion: z.string(),
  updatedAt: z.number(),
});

// Material-type schema version. Immutable once written — `schemaJson`
// stays atomic since there is no parallel-edit concern.
export const MaterialTypeCoMap = co.map({
  id: z.string(), // `${name}@${version}`
  schemaJson: z.string(),
});

// industry / seller — plain typed fields, each its own CRDT register.
export const OrgNodeCoMap = co.map({
  id: z.string(),
  type: z.string(), // "industry" | "seller"
  label: z.optional(z.string()),
  position: NodePosition,
  name: z.string(),
  country: z.optional(z.string()),
  contact: z.optional(z.string()),
  updatedAt: z.number(),
});

export const EdgeCoMap = co.map({
  id: z.string(),
  type: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
});

// Exported record types — also referenced by `Materials/main/materials.ts`
// when it has to create the catalog's child records on first use.
// Passing the right concrete schema keeps Jazz's runtime validation from
// rejecting subsequent `.$jazz.set(id, MaterialCoMap)` inserts (a
// `co.record(z.string(), AttributeCoMap)` would refuse).
export const MaterialsRecord = co.record(z.string(), MaterialCoMap);
export const MaterialTypesRecord = co.record(z.string(), MaterialTypeCoMap);
export const OrgNodesRecord = co.record(z.string(), OrgNodeCoMap);
export const EdgesRecord = co.record(z.string(), EdgeCoMap);

export const MaterialCatalogCoMap = co.map({
  materials: MaterialsRecord,
  materialTypes: MaterialTypesRecord,
  industries: OrgNodesRecord,
  sellers: OrgNodesRecord,
  edges: EdgesRecord,
});

export const WorkspaceCoMap = co.map({
  metadata: WorkspaceMetadata,
  models: ModelsMap,
  // Optional for schema-backward compatibility — workspaces created before
  // lazy hydration landed do not have this record. `requireWorkspace` in
  // the main process lazily creates + backfills it on first open.
  modelSummaries: co.optional(ModelSummariesMap),
  // Materials catalog. Optional so pre-Materials workspaces still load;
  // `requireMaterialsCatalog` in `Materials/main/materials.ts` lazily
  // creates and seeds it on first open.
  materials: co.optional(MaterialCatalogCoMap),
});

export const KlippelRoot = co.map({
  workspaces: co.list(WorkspaceCoMap),
});

export const KlippelAccountProfile = co.profile({
  name: z.string(),
});

export const KlippelAccount = co
  .account({
    profile: KlippelAccountProfile,
    root: KlippelRoot,
  })
  .withMigration(async (account) => {
    if (!account.$jazz.has("profile")) {
      const group = Group.create();
      group.addMember("everyone", "reader");
      account.$jazz.set(
        "profile",
        KlippelAccountProfile.create({ name: "Klippel User" }, group),
      );
    }
    if (!account.$jazz.has("root")) {
      const group = Group.create();
      account.$jazz.set(
        "root",
        KlippelRoot.create(
          { workspaces: co.list(WorkspaceCoMap).create([], group) },
          group,
        ),
      );
    }
  });
