/**
 * The Materials module's contribution to the workspace database.
 *
 * The DDL itself is `catalog.sql`, inlined at build time by Vite's `?raw`
 * import so a packaged app carries no loose asset to find at runtime. The
 * schema is owned here rather than by the kernel because the tables are this
 * module's — the kernel only runs migrations and, when cr-sqlite is present,
 * upgrades the tables each module declares as replicated.
 *
 * **Migrations are append-only.** Editing a shipped entry changes the schema of
 * databases that already ran it; add a new file and a new entry instead.
 */
import catalogV1 from "./catalog.sql?raw";
import catalogV2Tombstones from "./catalog-tombstones.sql?raw";

/** Ordered, append-only. The index into this array is the `user_version`. */
export const CATALOG_MIGRATIONS: readonly string[] = [
  catalogV1,
  catalogV2Tombstones,
];

/**
 * Tables `crsql_as_crr` is applied to when the extension is present.
 *
 * `material_usage` and `materials_fts` are deliberately absent: both are local
 * projections, derived from the replicated rows on each peer (and an FTS5
 * virtual table cannot be a CRR anyway).
 */
export const CATALOG_REPLICATED_TABLES = [
  "materials",
  "material_edges",
  "material_types",
  "organizations",
] as const;
