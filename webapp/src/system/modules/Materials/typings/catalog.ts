/**
 * Materials catalog DTOs — shared between the main-process Jazz layer
 * (`Materials/main/materials.ts`) and the renderer slice. Mirrors the
 * per-CoValue layout described in
 * `docs/architecture/graph-semantics.md`.
 *
 * Keep these as plain serializable shapes — they cross the IPC
 * boundary. Attribute leaves are JSON-encoded strings on the wire so
 * deeply-nested object attributes survive `structuredClone`.
 */

export interface StockDTO {
  amount: number;
  unit: string;
}

export interface AttributeDTO {
  key: string;
  // Leaf value, JSON-encoded. Set when this attribute is a leaf (string,
  // number, color, date, etc.); object attributes use `children`.
  valueJson?: string;
  children?: AttributeMap;
}

export interface AttributeMap {
  [name: string]: AttributeDTO;
}

export interface MaterialDTO {
  id: string;
  type: string;
  label?: string;
  position?: { x: number; y: number };
  attributes: AttributeMap;
  stock: StockDTO;
  composition?: AttributeMap;
  caracteristics?: AttributeMap;
  externalId?: string;
  externalURL?: string;
  /** Supplier product photo / colour swatch. */
  imageURL?: string;
  description?: string;
  schemaVersion: string;
  updatedAt: number;
}

export interface MaterialTypeVersionDTO {
  /** `${name}@${version}` */
  id: string;
  /** Serialized `MaterialTypeSchema`. */
  schemaJson: string;
}

export interface OrgNodeDTO {
  id: string;
  /** "industry" | "seller" */
  type: string;
  label?: string;
  position?: { x: number; y: number };
  name: string;
  country?: string;
  contact?: string;
  updatedAt: number;
}

export interface EdgeDTO {
  id: string;
  /** "conformsTo" | "manufacturedBy" | "suppliedBy" | "succeedsVersion" */
  type: string;
  sourceId: string;
  targetId: string;
}

export interface CatalogSnapshot {
  materials: { [id: string]: MaterialDTO };
  materialTypes: { [id: string]: MaterialTypeVersionDTO };
  industries: { [id: string]: OrgNodeDTO };
  sellers: { [id: string]: OrgNodeDTO };
  edges: { [id: string]: EdgeDTO };
}

/**
 * What changed in the catalog since a given client last asked.
 *
 * Catalog mutations used to fan out as "something changed", and every
 * renderer answered by re-fetching and re-deriving the entire catalog —
 * O(catalog) per edit, per renderer, on the main thread
 * (`docs/analysis/materials-catalog-lag-analysis.md`, F2). A delta carries only
 * the rows that moved.
 *
 * `full` is the escape hatch: on the first tick for a client, after a workspace
 * switch, or whenever the shadow that backs the diff is missing, there is no
 * meaningful "since", so the whole snapshot is sent and the client replaces its
 * state wholesale. Exactly one of `full` / the per-section fields is populated.
 *
 * `edges` is not merely the edges that changed: it carries **every** current
 * edge whose `sourceId` is one of the changed materials, because a material's
 * `suppliers` / `industry` are derived from that whole set, not from the
 * individual edge that moved.
 */
export interface CatalogDelta {
  full?: CatalogSnapshot;
  materials?: { [id: string]: MaterialDTO };
  removedMaterials?: string[];
  edges?: { [id: string]: EdgeDTO };
  removedEdges?: string[];
  materialTypes?: { [id: string]: MaterialTypeVersionDTO };
  industries?: { [id: string]: OrgNodeDTO };
  sellers?: { [id: string]: OrgNodeDTO };
}

export interface AddMaterialInput {
  material: MaterialDTO;
  industryId?: string;
  sellerIds?: string[];
  /** Pinned type version, e.g. `malha@0.0.1`. */
  typeVersion: string;
}

export interface UpdateMaterialInput {
  id: string;
  patch: Partial<Omit<MaterialDTO, "id">>;
  industryId?: string;
  sellerIds?: string[];
}

export interface UpdateMaterialStockInput {
  id: string;
  stock: StockDTO;
}

export interface SeedCatalogInput {
  /** Only applied if the catalog is empty. */
  materials: MaterialDTO[];
  materialTypes: MaterialTypeVersionDTO[];
  industries: OrgNodeDTO[];
  sellers: OrgNodeDTO[];
  edges: EdgeDTO[];
}
