/**
 * Models, documents and edit leases, in SQLite.
 *
 * Phase 3 of `src/docs/analysis/post-jazz-storage-study.md`. The IPC contract
 * and every DTO are unchanged, so the renderer does not know the difference —
 * the same property that let the catalog move in phases 1 and 2.
 *
 * Two things are worth knowing before changing anything here:
 *
 * - **`coId` is now a storage id.** It was a Jazz CoValue id and is now the
 *   row's uuidv5. Callers treat it as opaque (`loadModel` used it to find the
 *   body; that is a primary-key lookup now), so the field stays populated and
 *   nothing downstream has to care — but it is not a Jazz reference any more
 *   and must not be handed to anything expecting one.
 * - **The edit lease is local.** Under Jazz it was a CoValue that synced, so a
 *   peer could see another peer's lock. In SQLite it is a local table, which
 *   means the lock is only enforced within this process until phase 4 gives it
 *   a coordinator. That is a *narrowing* of the guarantee, and it is called out
 *   in the schema and in the change doc rather than left to be discovered.
 */
import { prepare, workspaceDb } from "../../../../../electron/main/db";
import { storageId } from "../../../../../electron/main/db/ids";
import { SQL } from "./queries";
import type {
  CreateModelInput,
  EditLeaseSnapshot,
  LoadedModel,
  ModelSummary as ModelSummaryDTO,
} from "../typings";

/** How long a freshly taken lease is good for. */
const LEASE_TTL_MS = 60_000;

/**
 * Largest attachment we accept.
 *
 * The old ceiling was 15 MB and it was Jazz's: blobs failed past ~16 MiB, deep
 * inside sync, where the user got no usable message. Bytes live in a SQLite
 * `BLOB` column now, and the constraints are different ones:
 *
 * - **The engine's hard cap is 1 GB.** `SQLITE_MAX_LENGTH=1000000000` in this
 *   build (from `PRAGMA compile_options`) — not the 2 GB that SQLite can be
 *   compiled for. Past it the insert fails with "string or blob too big".
 * - **The practical cap is memory, and it is much lower.** Reading an
 *   attachment materialises the whole blob as a Buffer in main and then
 *   structured-clones it across IPC, so a 256 MB file is ~512 MB resident
 *   while it is in flight. Measured on this schema: 256 MB writes in 631 ms
 *   and reads in 115 ms, so the cost is bearable — it is the footprint that
 *   argues for a limit, not the speed.
 *
 * 256 MB sits an order of magnitude inside the engine cap and 17× above what
 * Jazz allowed. Listing attachments never pays any of this: `listDocuments`
 * does not select `bytes`, and `length()` on a blob is metadata — 0.1 ms
 * regardless of size.
 *
 * Kept as *our* limit rather than letting SQLite raise its own error, because
 * a limit the app states is one the user can be told about
 * (`DocumentListAccordion/AddDocumentButton.tsx` renders whatever we reject
 * with).
 */
export const MAX_DOCUMENT_BYTES = 256 * 1024 * 1024;

const db = (workspace: string) => workspaceDb(workspace).db;

interface ModelRow {
  model_key: string;
  id: string;
  name: string;
  description: string;
  updated_at: number;
  has_svg: number;
}

const summaryOf = (row: ModelRow): ModelSummaryDTO => ({
  id: row.model_key,
  coId: row.id,
  name: row.name,
  description: row.description,
  hasSvg: row.has_svg === 1,
  updatedAt: row.updated_at,
});

export function listModels(workspace: string): ModelSummaryDTO[] {
  return (prepare(db(workspace), SQL.listModels).all() as ModelRow[]).map(
    summaryOf,
  );
}

export function loadModel(workspace: string, id: string): LoadedModel | null {
  const row = prepare(db(workspace), SQL.selectModel).get(id) as
    | (ModelRow & { graph_json: string })
    | undefined;
  if (!row) return null;
  const lease = readLease(workspace, id);
  return {
    id: row.model_key,
    coId: row.id,
    name: row.name,
    description: row.description,
    graphJson: row.graph_json,
    hasSvg: row.has_svg === 1,
    updatedAt: row.updated_at,
    editLease: lease ?? undefined,
  };
}

export function modelExists(workspace: string, id: string): boolean {
  return Boolean(prepare(db(workspace), SQL.selectModelMeta).get(id));
}

export function createModel(
  workspace: string,
  input: CreateModelInput,
): ModelSummaryDTO {
  if (modelExists(workspace, input.id)) {
    throw new Error(`Model "${input.id}" already exists`);
  }
  const updatedAt = Date.now();
  prepare(db(workspace), SQL.insertModel).run({
    id: storageId("model", input.id),
    model_key: input.id,
    name: input.name,
    description: input.description ?? "",
    graph_json: input.graphJson,
    updated_at: updatedAt,
  });
  return {
    id: input.id,
    coId: storageId("model", input.id),
    name: input.name,
    description: input.description ?? "",
    hasSvg: false,
    updatedAt,
  };
}

/**
 * Throw when someone else holds a live lease on this model.
 *
 * The guard every write goes through. A lease that has expired is not a lock —
 * an editor that went away without releasing must not wedge the model.
 */
function assertWritable(workspace: string, id: string, accountId: string): void {
  const lease = readLease(workspace, id);
  if (!lease) return;
  if (lease.expiresAt < Date.now()) return;
  if (lease.holderAccountId === accountId) return;
  throw new Error(`Model "${id}" is locked by ${lease.holderAccountId}`);
}

export function updateModelGraph(
  workspace: string,
  id: string,
  graphJson: string,
  accountId: string,
): void {
  assertWritable(workspace, id, accountId);
  const result = prepare(db(workspace), SQL.updateModelGraph).run(
    graphJson,
    Date.now(),
    id,
  );
  if (result.changes === 0) throw new Error(`Model "${id}" not found`);
}

export function updateModelDescription(
  workspace: string,
  id: string,
  description: string,
): void {
  const result = prepare(db(workspace), SQL.updateModelDescription).run(
    description,
    Date.now(),
    id,
  );
  if (result.changes === 0) throw new Error(`Model "${id}" not found`);
}

// ---- edit leases ----------------------------------------------------

export function readLease(
  workspace: string,
  id: string,
): EditLeaseSnapshot | null {
  const row = prepare(db(workspace), SQL.selectLease).get(id) as
    | {
        holder_account_id: string;
        acquired_at: number;
        expires_at: number;
      }
    | undefined;
  if (!row) return null;
  return {
    holderAccountId: row.holder_account_id,
    acquiredAt: row.acquired_at,
    expiresAt: row.expires_at,
  };
}

export function acquireLease(
  workspace: string,
  id: string,
  accountId: string,
): EditLeaseSnapshot {
  if (!modelExists(workspace, id)) throw new Error(`Model "${id}" not found`);
  const existing = readLease(workspace, id);
  if (
    existing &&
    existing.expiresAt >= Date.now() &&
    existing.holderAccountId !== accountId
  ) {
    throw new Error(`Model "${id}" is locked by ${existing.holderAccountId}`);
  }
  const now = Date.now();
  const lease: EditLeaseSnapshot = {
    holderAccountId: accountId,
    acquiredAt: now,
    expiresAt: now + LEASE_TTL_MS,
  };
  prepare(db(workspace), SQL.upsertLease).run(
    id,
    lease.holderAccountId,
    lease.acquiredAt,
    lease.expiresAt,
  );
  return lease;
}

export function renewLease(
  workspace: string,
  id: string,
  accountId: string,
): EditLeaseSnapshot {
  const result = prepare(db(workspace), SQL.renewLease).run(
    Date.now() + LEASE_TTL_MS,
    id,
    accountId,
  );
  if (result.changes === 0) {
    throw new Error(`Cannot renew lease for "${id}" — not the holder`);
  }
  const lease = readLease(workspace, id);
  if (!lease) throw new Error(`Cannot renew lease for "${id}" — not the holder`);
  return lease;
}

export function releaseLease(
  workspace: string,
  id: string,
  accountId: string,
): void {
  prepare(db(workspace), SQL.deleteLease).run(id, accountId);
}

// ---- svg and attachments --------------------------------------------

export function saveModelSvg(
  workspace: string,
  id: string,
  svg: string,
  accountId: string,
): { coId: string } {
  assertWritable(workspace, id, accountId);
  const result = prepare(db(workspace), SQL.updateModelSvg).run(
    svg,
    Date.now(),
    id,
  );
  if (result.changes === 0) throw new Error(`Model "${id}" not found`);
  return { coId: storageId("model", id) };
}

export function loadModelSvg(workspace: string, id: string): string | null {
  const row = prepare(db(workspace), SQL.selectModelSvg).get(id) as
    | { svg: string }
    | undefined;
  if (!row) throw new Error(`Model "${id}" not found`);
  return row.svg === "" ? null : row.svg;
}

export interface StoredDocument {
  documentId: string;
  kind: string;
  mime: string;
  filename: string;
  size: number;
  bytes: Uint8Array;
}

export function saveModelDocument(
  workspace: string,
  modelKey: string,
  input: StoredDocument,
  accountId: string,
): { coId: string; size: number } {
  assertWritable(workspace, modelKey, accountId);
  if (!modelExists(workspace, modelKey)) {
    throw new Error(`Model "${modelKey}" not found`);
  }
  const now = Date.now();
  // The document's identity is (model, document): the same attachment id under
  // two models is two attachments.
  const id = storageId("modelDocument", `${modelKey}/${input.documentId}`);
  prepare(db(workspace), SQL.upsertDocument).run({
    id,
    document_key: input.documentId,
    model_key: modelKey,
    kind: input.kind,
    mime: input.mime,
    filename: input.filename,
    size: input.size,
    bytes: input.bytes,
    updated_at: now,
  });
  return { coId: id, size: input.size };
}

export function loadModelDocument(
  workspace: string,
  modelKey: string,
  documentId: string,
): { bytes: ArrayBuffer; mime: string; filename: string } | null {
  if (!modelExists(workspace, modelKey)) {
    throw new Error(`Model "${modelKey}" not found`);
  }
  const row = prepare(db(workspace), SQL.selectDocument).get(
    modelKey,
    documentId,
  ) as { bytes: Uint8Array; mime: string; filename: string } | undefined;
  if (!row) return null;
  const bytes = row.bytes;
  return {
    bytes: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
    mime: row.mime,
    filename: row.filename,
  };
}

export function deleteModelDocument(
  workspace: string,
  modelKey: string,
  documentId: string,
  accountId: string,
): void {
  assertWritable(workspace, modelKey, accountId);
  prepare(db(workspace), SQL.deleteDocument).run(modelKey, documentId);
}

/** Every model's graph — the usage projection's one legitimate whole-table read. */
export function allModelGraphs(
  workspace: string,
): Array<{ id: string; graphJson: string }> {
  return (
    prepare(db(workspace), SQL.allModelGraphs).all() as Array<{
      model_key: string;
      graph_json: string;
    }>
  ).map((row) => ({ id: row.model_key, graphJson: row.graph_json }));
}

export function countModels(workspace: string): number {
  return (prepare(db(workspace), SQL.countModels).get() as { n: number }).n;
}
