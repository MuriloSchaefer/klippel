/**
 * Every SQL statement the Composer module runs, as SQL.
 *
 * Mirrors `Materials/main/queries`: files beside this one, inlined at build
 * time by Vite's `?raw`, internal to the module. Nothing outside
 * `Composer/main` imports from here.
 */
import listModels from "./read/listModels.sql?raw";
import selectModel from "./read/selectModel.sql?raw";
import selectModelMeta from "./read/selectModelMeta.sql?raw";
import selectModelSvg from "./read/selectModelSvg.sql?raw";
import selectLease from "./read/selectLease.sql?raw";
import selectDocument from "./read/selectDocument.sql?raw";
import listDocuments from "./read/listDocuments.sql?raw";
import countModels from "./read/countModels.sql?raw";
import allModelGraphs from "./read/allModelGraphs.sql?raw";

import insertModel from "./write/insertModel.sql?raw";
import upsertModel from "./write/upsertModel.sql?raw";
import updateModelGraph from "./write/updateModelGraph.sql?raw";
import updateModelDescription from "./write/updateModelDescription.sql?raw";
import updateModelSvg from "./write/updateModelSvg.sql?raw";
import upsertLease from "./write/upsertLease.sql?raw";
import renewLease from "./write/renewLease.sql?raw";
import deleteLease from "./write/deleteLease.sql?raw";
import upsertDocument from "./write/upsertDocument.sql?raw";
import deleteDocument from "./write/deleteDocument.sql?raw";

export const SQL = Object.freeze({
  listModels,
  selectModel,
  selectModelMeta,
  selectModelSvg,
  selectLease,
  selectDocument,
  listDocuments,
  countModels,
  allModelGraphs,

  insertModel,
  upsertModel,
  updateModelGraph,
  updateModelDescription,
  updateModelSvg,
  upsertLease,
  renewLease,
  deleteLease,
  upsertDocument,
  deleteDocument,
});
