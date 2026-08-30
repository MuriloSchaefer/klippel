/**
 * Every SQL statement the Materials module runs, as SQL.
 *
 * The statements live in `.sql` files beside this one rather than in template
 * literals: they read as SQL, diff as SQL, and can be pasted into any client
 * against a live database while debugging. Vite's `?raw` inlines them at build
 * time, so a packaged app carries no loose asset to find at runtime.
 *
 * **Internal to this module.** Nothing outside `Materials/main` imports from
 * here — the module's own `index.ts` is the export surface, so the tables and
 * the statements that touch them stay one thing that can be changed together.
 *
 * Two rules keep the statements static, which is what lets them be files at
 * all and lets `prepare` cache them:
 *
 * - **Sets of ids go through `json_each`**, not through a generated
 *   `IN (?, ?, …)`. SQLite caps host parameters, and a page plus its pins can
 *   exceed the cap, so the alternative is chunking a query that did not need
 *   to be chunked.
 * - **Partial updates go through `COALESCE(@param, column)`**, not a SET
 *   clause assembled per call. A parameter bound to NULL means "leave this
 *   alone"; every other value, including the empty string, is a real write.
 */

// -- reads
import countMaterials from "./read/countMaterials.sql?raw";
import selectMaterialByKey from "./read/selectMaterialByKey.sql?raw";
import selectMaterialsByKeys from "./read/selectMaterialsByKeys.sql?raw";
import selectExistingKeys from "./read/selectExistingKeys.sql?raw";
import pageRanked from "./read/pageRanked.sql?raw";
import pageByType from "./read/pageByType.sql?raw";
import countByType from "./read/countByType.sql?raw";
import searchRanked from "./read/searchRanked.sql?raw";
import searchRankedByType from "./read/searchRankedByType.sql?raw";
import selectEdgesBySource from "./read/selectEdgesBySource.sql?raw";
import selectTypes from "./read/selectTypes.sql?raw";
import selectOrganizations from "./read/selectOrganizations.sql?raw";
import selectChangedSince from "./read/selectChangedSince.sql?raw";
import selectTombstonesSince from "./read/selectTombstonesSince.sql?raw";
import selectMaterialMeta from "./read/selectMaterialMeta.sql?raw";
import anyMaterial from "./read/anyMaterial.sql?raw";
import anyType from "./read/anyType.sql?raw";
import typeExists from "./read/typeExists.sql?raw";

// -- writes
import upsertMaterial from "./write/upsertMaterial.sql?raw";
import updateMaterialPatch from "./write/updateMaterialPatch.sql?raw";
import updateStock from "./write/updateStock.sql?raw";
import upsertEdge from "./write/upsertEdge.sql?raw";
import updateConformsTarget from "./write/updateConformsTarget.sql?raw";
import deleteEdgeByKey from "./write/deleteEdgeByKey.sql?raw";
import deleteSupplierEdges from "./write/deleteSupplierEdges.sql?raw";
import deleteMaterialEdges from "./write/deleteMaterialEdges.sql?raw";
import deleteMaterial from "./write/deleteMaterial.sql?raw";
import selectIndustryEdge from "./write/selectIndustryEdge.sql?raw";
import upsertType from "./write/upsertType.sql?raw";
import insertTypeVersion from "./write/insertTypeVersion.sql?raw";
import insertSucceedsEdge from "./write/insertSucceedsEdge.sql?raw";
import upsertOrganization from "./write/upsertOrganization.sql?raw";
import insertOrganizationIfAbsent from "./write/insertOrganizationIfAbsent.sql?raw";
import insertTombstone from "./write/insertTombstone.sql?raw";
import deleteTombstone from "./write/deleteTombstone.sql?raw";
import clearUsage from "./write/clearUsage.sql?raw";
import insertUsage from "./write/insertUsage.sql?raw";

// -- full-text index
import ftsSelectSource from "./fts/selectSource.sql?raw";
import ftsSelectAllSources from "./fts/selectAllSources.sql?raw";
import ftsDeleteRow from "./fts/deleteRow.sql?raw";
import ftsInsertRow from "./fts/insertRow.sql?raw";
import ftsClearAll from "./fts/clearAll.sql?raw";

/**
 * The statements, by name. Frozen because a statement is a constant, and the
 * prepared-statement cache is keyed on the text.
 */
export const SQL = Object.freeze({
  countMaterials,
  selectMaterialByKey,
  selectMaterialsByKeys,
  selectExistingKeys,
  pageRanked,
  pageByType,
  countByType,
  searchRanked,
  searchRankedByType,
  selectEdgesBySource,
  selectTypes,
  selectOrganizations,
  selectChangedSince,
  selectTombstonesSince,
  selectMaterialMeta,
  anyMaterial,
  anyType,
  typeExists,

  upsertMaterial,
  updateMaterialPatch,
  updateStock,
  upsertEdge,
  updateConformsTarget,
  deleteEdgeByKey,
  deleteSupplierEdges,
  deleteMaterialEdges,
  deleteMaterial,
  selectIndustryEdge,
  upsertType,
  insertTypeVersion,
  insertSucceedsEdge,
  upsertOrganization,
  insertOrganizationIfAbsent,
  insertTombstone,
  deleteTombstone,
  clearUsage,
  insertUsage,

  ftsSelectSource,
  ftsSelectAllSources,
  ftsDeleteRow,
  ftsInsertRow,
  ftsClearAll,
});

export type QueryName = keyof typeof SQL;

/**
 * A set of ids as one bound parameter, for the `json_each` statements.
 *
 * Keeping the encoding here rather than at each call site is the point: a
 * caller that passed the array itself would bind an unsupported value, and one
 * that hand-rolled `IN (...)` would reintroduce the parameter cap.
 */
export const idSet = (ids: readonly string[]): string => JSON.stringify(ids);
