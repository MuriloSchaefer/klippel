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
  /**
   * Materials in the catalog right now, and how many of them match the
   * client's active query. Both are counts over the *whole* catalog, not over
   * what the client holds — a windowed client mirrors far fewer rows than
   * exist, so without these it cannot tell "the catalog has 10 000 rows" from
   * "I have loaded 100". Present only for windowed clients.
   */
  total?: number;
  matched?: number;
}

/**
 * A request for one page of the catalog.
 *
 * The renderer no longer mirrors every material. It asks for a *window*:
 * the rows open models reference, plus the most-used page, and then more as
 * the user searches or scrolls (see the `Still open` note in
 * docs/analysis/materials-catalog-lag-analysis.md).
 *
 * Exactly one addressing mode applies, in this precedence:
 *   1. `ids`   — resolve these specific materials (lazy by-id load).
 *   2. `query` — the query's ranked matches, paged by `offset`/`limit`.
 *   3. neither — the usage-ranked catalog, paged by `offset`/`limit`.
 *
 * `pinnedIds` is orthogonal: those rows come back with every answer whatever
 * the mode, because dropping a material an open model references would blank
 * a node the user is looking at.
 */
export interface CatalogWindowRequest {
  pinnedIds?: string[];
  ids?: string[];
  query?: string;
  /**
   * Restrict the candidate set to one material type, before ranking or
   * searching.
   *
   * This is what keeps the material *pickers* correct under windowing. A
   * picker offers "every material of type X" and resolves its current value
   * by id; both are questions about the catalog, and answering them from the
   * resident page would silently offer a subset and blank any value outside
   * it. Type cardinality is a fraction of catalog size, so the type's page is
   * affordable where the catalog's is not.
   */
  type?: string;
  offset?: number;
  limit?: number;
  /**
   * Replace this client's mirror with the answer instead of extending it.
   * Set on cold open and workspace switch; without it a switch would leave
   * the previous workspace's rows in the slice.
   */
  reset?: boolean;
}

/**
 * One page of the catalog, plus the counts the client needs to know how much
 * of it the page represents.
 *
 * `materialTypes` / `industries` / `sellers` always come whole: they are
 * bounded by the number of *types* and *organizations*, not by catalog size,
 * and every row rendered needs its type schema to resolve.
 */
export interface CatalogWindow {
  materials: { [id: string]: MaterialDTO };
  /** Every current edge of every material in `materials`. */
  edges: { [id: string]: EdgeDTO };
  materialTypes: { [id: string]: MaterialTypeVersionDTO };
  industries: { [id: string]: OrgNodeDTO };
  sellers: { [id: string]: OrgNodeDTO };
  /** This page's ids, in rank order. Excludes `pinned`. */
  page: string[];
  /** Pinned ids included in this answer. */
  pinned: string[];
  offset: number;
  limit: number;
  /** Materials matching `query` — equals `total` when the query is empty. */
  matched: number;
  /** Materials in the catalog. */
  total: number;
  /** Whether `offset + limit < matched`. */
  hasMore: boolean;
  query: string;
  reset: boolean;
  /**
   * Echo of the addressing mode, so the reducer knows how to merge.
   *
   * `rank` / `search` produce the stock grid's view and move its paging
   * cursor. `ids` and `type` do not: they load rows something else needs — a
   * model's nodes, a picker's options — and must leave the grid's page alone.
   */
  mode: "rank" | "search" | "ids" | "type";
  /** Echo of `request.type`, when the answer was type-scoped. */
  type?: string;
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
