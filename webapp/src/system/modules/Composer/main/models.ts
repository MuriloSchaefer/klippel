import { co } from "jazz-tools";
import {
  DocumentCoMap,
  DocumentsMap,
  EditLease,
  ModelCoMap,
  ModelSummary,
  ModelSummariesMap,
} from "../../../../kernel/modules/Store/schema";
import {
  getActiveWorkspace,
  requireActiveWorkspaceHandle,
} from "../../../../../electron/main/jazz";
import type {
  CreateModelInput,
  EditLeaseSnapshot,
  LoadedModel,
  ModelSummary as ModelSummaryDTO,
} from "../typings";

const LEASE_TTL_MS = 60_000;

type ResolvedSummary = {
  id: string;
  modelCoId: string;
  name: string;
  description: string;
  updatedAt: number;
  hasSvg: boolean;
  $jazz: { set: (k: string, v: unknown) => void };
};

type SummariesRecord = {
  [id: string]: ResolvedSummary | undefined;
} & { $jazz: { set: (k: string, v: unknown) => void } };

type ResolvedWorkspace = {
  $jazz: { owner: unknown; set: (k: string, v: unknown) => void };
  models: {
    $jazz: { set: (k: string, v: unknown) => void };
  } & Record<string, unknown>;
  modelSummaries: SummariesRecord | null | undefined;
};

/**
 * Object.entries on a Jazz record yields the `$jazz` symbol-bag as one of
 * the entries; filter it out and narrow the value type for callers.
 */
function summaryEntries(record: SummariesRecord): Array<[string, ResolvedSummary]> {
  const out: Array<[string, ResolvedSummary]> = [];
  for (const [k, v] of Object.entries(record as Record<string, unknown>)) {
    if (k === "$jazz" || !v || typeof v !== "object") continue;
    if (!("modelCoId" in (v as Record<string, unknown>))) continue;
    out.push([k, v as ResolvedSummary]);
  }
  return out;
}

async function requireWorkspace(): Promise<ResolvedWorkspace> {
  const handle = await requireActiveWorkspaceHandle();
  return handle as unknown as ResolvedWorkspace;
}

/**
 * Ensure the workspace's `modelSummaries` record exists. The backfill in
 * `jazz.ts` creates it for any workspace that had models when first
 * opened post-migration, but a freshly-bootstrapped or freshly-joined
 * workspace may still have the field undefined until the first model is
 * created — guard the mutators here.
 */
function ensureSummariesRecord(workspace: ResolvedWorkspace): NonNullable<
  ResolvedWorkspace["modelSummaries"]
> {
  if (workspace.modelSummaries) return workspace.modelSummaries;
  const owner = workspace.$jazz.owner;
  const created = ModelSummariesMap.create(
    {},
    owner as Parameters<typeof ModelSummariesMap.create>[1],
  );
  workspace.$jazz.set("modelSummaries", created);
  return (workspace.modelSummaries =
    created as unknown as NonNullable<ResolvedWorkspace["modelSummaries"]>);
}

function currentAccountId(): string {
  const active = getActiveWorkspace();
  if (!active) throw new Error("No active workspace");
  const account = active.context.account as unknown as { $jazz: { id: string } };
  return account.$jazz.id;
}

type LoadedLease = {
  holderAccountId: string;
  acquiredAt: number;
  expiresAt: number;
  $jazz: { set: (key: "expiresAt", value: number) => void };
};

type LoadedFullModel = {
  id: string;
  name: string;
  description: string;
  graphJson: string;
  updatedAt: number;
  svg?: unknown;
  documents?: DocumentsRecord | null;
  editLease?: unknown;
  $jazz: { id: string; owner: unknown; refs: { svg?: unknown }; set: (k: string, v: unknown) => void };
};

type ResolvedDocument = {
  documentId: string;
  kind: string;
  mime: string;
  filename: string;
  size: number;
  updatedAt: number;
  blob?: unknown;
  $jazz: { id: string; refs: { blob?: { id: string } }; set: (k: string, v: unknown) => void };
};

type DocumentsRecord = {
  [documentId: string]: ResolvedDocument | undefined;
} & {
  $jazz: {
    set: (k: string, v: unknown) => void;
    delete?: (k: string) => void;
  };
};

function loadedLease(model: { editLease?: unknown }): LoadedLease | undefined {
  const lease = model.editLease as
    | (LoadedLease & { $isLoaded?: boolean })
    | { $isLoaded: false }
    | undefined;
  if (!lease) return undefined;
  if ("$isLoaded" in lease && lease.$isLoaded === false) return undefined;
  return lease as LoadedLease;
}

function leaseHeldByOther(model: { editLease?: unknown }): boolean {
  const lease = loadedLease(model);
  if (!lease) return false;
  if (lease.expiresAt < Date.now()) return false;
  return lease.holderAccountId !== currentAccountId();
}

async function loadFullModel(modelCoId: string): Promise<LoadedFullModel | null> {
  const settled = await ModelCoMap.load(modelCoId, {
    // `documents.$each` resolves the metadata CoMaps only — their `blob`
    // fileStreams stay unresolved refs, so listing a model's attachments never
    // drags the bytes through sync. `loadModelDocument` fetches one on demand.
    resolve: {
      editLease: { $onError: "catch" },
      documents: { $each: { $onError: "catch" }, $onError: "catch" },
    },
  });
  if (!settled || ("$isLoaded" in settled && settled.$isLoaded === false)) {
    return null;
  }
  return settled as unknown as LoadedFullModel;
}

/**
 * Mirror the subset of mutating writes back to a model's summary. Keeps
 * `listModels` (which reads only summaries) consistent with the
 * authoritative `ModelCoMap` body.
 */
function patchSummary(
  summary: ResolvedSummary | undefined,
  patch: Partial<Pick<ResolvedSummary, "name" | "description" | "updatedAt" | "hasSvg">>,
): void {
  if (!summary) return;
  for (const [k, v] of Object.entries(patch)) {
    summary.$jazz.set(k, v);
  }
}

export async function listModels(): Promise<ModelSummaryDTO[]> {
  const workspace = await requireWorkspace();
  const summaries = workspace.modelSummaries;
  if (!summaries) return [];
  return summaryEntries(summaries).map(([id, summary]) => ({
    id,
    coId: summary.modelCoId,
    name: summary.name,
    description: summary.description,
    hasSvg: summary.hasSvg,
    updatedAt: summary.updatedAt,
  }));
}

export async function loadModel(id: string): Promise<LoadedModel | null> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) return null;
  const model = await loadFullModel(summary.modelCoId);
  if (!model) return null;
  const lease = loadedLease(model);
  return {
    id: model.id,
    coId: model.$jazz.id,
    name: model.name,
    description: model.description,
    graphJson: model.graphJson,
    hasSvg: model.svg !== undefined,
    updatedAt: model.updatedAt,
    editLease: lease
      ? {
          holderAccountId: lease.holderAccountId,
          acquiredAt: lease.acquiredAt,
          expiresAt: lease.expiresAt,
        }
      : undefined,
  };
}

export async function createModel(input: CreateModelInput): Promise<ModelSummaryDTO> {
  const workspace = await requireWorkspace();
  if (workspace.modelSummaries?.[input.id]) {
    throw new Error(`Model "${input.id}" already exists`);
  }
  const owner = workspace.$jazz.owner as Parameters<typeof ModelCoMap.create>[1];
  const updatedAt = Date.now();
  const model = ModelCoMap.create(
    {
      id: input.id,
      name: input.name,
      description: input.description ?? "",
      graphJson: input.graphJson,
      updatedAt,
    },
    owner,
  );
  workspace.models.$jazz.set(input.id, model);

  const summaries = ensureSummariesRecord(workspace);
  const summary = ModelSummary.create(
    {
      id: input.id,
      modelCoId: model.$jazz.id,
      name: input.name,
      description: input.description ?? "",
      updatedAt,
      hasSvg: false,
    },
    owner as Parameters<typeof ModelSummary.create>[1],
  );
  summaries.$jazz.set(input.id, summary);

  return {
    id: input.id,
    coId: model.$jazz.id,
    name: input.name,
    description: input.description ?? "",
    hasSvg: false,
    updatedAt,
  };
}

export async function updateModelGraph(id: string, graphJson: string): Promise<void> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) throw new Error(`Model "${id}" not found`);
  const model = await loadFullModel(summary.modelCoId);
  if (!model) throw new Error(`Model "${id}" not found`);
  if (leaseHeldByOther(model)) {
    throw new Error(`Model "${id}" is locked by another editor`);
  }
  const now = Date.now();
  model.$jazz.set("graphJson", graphJson);
  model.$jazz.set("updatedAt", now);
  patchSummary(summary, { updatedAt: now });

  // A save is the moment the graph becomes authoritative, so it is also the
  // moment to reconcile the attachment blobs against it: bytes are written on
  // upload, but the node naming them only arrives here. Anything the graph no
  // longer references is dropped.
  try {
    pruneOrphanDocuments(model, graphJson);
  } catch (err) {
    // Never fail the save over housekeeping — a surviving orphan costs storage,
    // a failed save costs the user's work.
    console.error("[models] pruning orphan documents failed", err);
  }
}

/**
 * Ids of every DOCUMENT node in a serialized graph. Parsing the JSON we just
 * wrote is deliberate: it is the exact state being persisted, so the prune can
 * never disagree with it.
 */
function documentIdsInGraph(graphJson: string): string[] {
  const parsed = JSON.parse(graphJson) as {
    nodes?: Record<string, { type?: string; documentId?: string }>;
  };
  const out: string[] = [];
  for (const node of Object.values(parsed.nodes ?? {})) {
    if (node?.type === "DOCUMENT" && node.documentId) out.push(node.documentId);
  }
  return out;
}

function pruneOrphanDocuments(model: LoadedFullModel, graphJson: string): void {
  const documents = model.documents as DocumentsRecord | null | undefined;
  if (!documents) return;
  const keep = new Set(documentIdsInGraph(graphJson));
  for (const [key] of documentEntries(documents)) {
    if (keep.has(key)) continue;
    if (typeof documents.$jazz.delete === "function") {
      documents.$jazz.delete(key);
    } else {
      documents.$jazz.set(key, undefined);
    }
  }
}

export async function updateModelDescription(id: string, description: string): Promise<void> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) throw new Error(`Model "${id}" not found`);
  const model = await loadFullModel(summary.modelCoId);
  if (!model) throw new Error(`Model "${id}" not found`);
  const now = Date.now();
  model.$jazz.set("description", description);
  model.$jazz.set("updatedAt", now);
  patchSummary(summary, { description, updatedAt: now });
}

export async function acquireEditLease(id: string): Promise<EditLeaseSnapshot> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) throw new Error(`Model "${id}" not found`);
  const model = await loadFullModel(summary.modelCoId);
  if (!model) throw new Error(`Model "${id}" not found`);
  const existing = loadedLease(model);
  if (existing && existing.expiresAt >= Date.now() && existing.holderAccountId !== currentAccountId()) {
    throw new Error(`Model "${id}" is locked by ${existing.holderAccountId}`);
  }
  const now = Date.now();
  const lease = EditLease.create(
    {
      holderAccountId: currentAccountId(),
      acquiredAt: now,
      expiresAt: now + LEASE_TTL_MS,
    },
    model.$jazz.owner as Parameters<typeof EditLease.create>[1],
  );
  model.$jazz.set("editLease", lease);
  return {
    holderAccountId: lease.holderAccountId,
    acquiredAt: lease.acquiredAt,
    expiresAt: lease.expiresAt,
  };
}

export async function renewEditLease(id: string): Promise<EditLeaseSnapshot> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) throw new Error(`Model "${id}" not found`);
  const model = await loadFullModel(summary.modelCoId);
  if (!model) throw new Error(`Model "${id}" not found`);
  const lease = loadedLease(model);
  if (!lease || lease.holderAccountId !== currentAccountId()) {
    throw new Error(`Cannot renew lease for "${id}" — not the holder`);
  }
  const now = Date.now();
  lease.$jazz.set("expiresAt", now + LEASE_TTL_MS);
  return {
    holderAccountId: lease.holderAccountId,
    acquiredAt: lease.acquiredAt,
    expiresAt: lease.expiresAt,
  };
}

export async function releaseEditLease(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) return;
  const model = await loadFullModel(summary.modelCoId);
  if (!model) return;
  const lease = loadedLease(model);
  if (!lease || lease.holderAccountId !== currentAccountId()) return;
  model.$jazz.set("editLease", undefined);
}

export async function uploadModelSvg(id: string, svgContent: string): Promise<{ coId: string }> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) throw new Error(`Model "${id}" not found`);
  const model = await loadFullModel(summary.modelCoId);
  if (!model) throw new Error(`Model "${id}" not found`);
  if (leaseHeldByOther(model)) {
    throw new Error(`Model "${id}" is locked by another editor`);
  }
  const bytes = new TextEncoder().encode(svgContent);
  // ArrayBuffer typing across DOM and Node lib varies; the underlying buffer
  // is interchangeable at runtime.
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = await co.fileStream().createFromArrayBuffer(
    ab,
    "image/svg+xml",
    `${id}.svg`,
    { owner: model.$jazz.owner } as never,
  );
  const now = Date.now();
  model.$jazz.set("svg", stream);
  model.$jazz.set("updatedAt", now);
  patchSummary(summary, { hasSvg: true, updatedAt: now });
  return { coId: stream.$jazz.id };
}

export async function loadModelSvg(id: string): Promise<string | null> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) throw new Error(`Model "${id}" not found`);
  const model = await loadFullModel(summary.modelCoId);
  if (!model) throw new Error(`Model "${id}" not found`);
  const svgRef = model.$jazz.refs.svg;
  if (!svgRef) return null;
  const blob = await co.fileStream().loadAsBlob((svgRef as { id: string }).id);
  if (!blob) return null;
  return new TextDecoder().decode(await blob.arrayBuffer());
}

// ---- attachments -----------------------------------------------------
//
// User-uploaded files. Metadata lives in `ModelCoMap.documents` (a record of
// `DocumentCoMap`), the bytes in each entry's `blob` fileStream. The graph's
// `DocumentNode` carries metadata + coId only, so nothing here ever lands in
// `graphJson` — see the schema comment on `DocumentCoMap`.

/**
 * Largest attachment we accept.
 *
 * Jazz fails on blobs past ~16 MiB (recorded in the jazz-foundation change
 * doc), and it fails deep inside sync where the user gets no usable message.
 * Rejecting a little earlier, by our own rule, is what makes the failure
 * explainable.
 */
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export interface UploadDocumentInput {
  documentId: string;
  kind: string;
  mime: string;
  filename: string;
  bytes: ArrayBuffer | Uint8Array;
}

/**
 * Entries of a Jazz record, minus the `$jazz` symbol-bag. Mirrors
 * `summaryEntries` above.
 */
function documentEntries(
  record: DocumentsRecord | null | undefined,
): Array<[string, ResolvedDocument]> {
  const out: Array<[string, ResolvedDocument]> = [];
  if (!record) return out;
  for (const [k, v] of Object.entries(record as Record<string, unknown>)) {
    if (k === "$jazz" || !v || typeof v !== "object") continue;
    if (!("documentId" in (v as Record<string, unknown>))) continue;
    out.push([k, v as ResolvedDocument]);
  }
  return out;
}

/**
 * Resolve the model behind `id` for a write, refusing when another peer holds
 * the edit lease. Same guard `uploadModelSvg` applies — an attachment is a
 * model mutation like any other.
 */
async function requireWritableModel(id: string): Promise<{
  model: LoadedFullModel;
  summary: ResolvedSummary | undefined;
}> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) throw new Error(`Model "${id}" not found`);
  const model = await loadFullModel(summary.modelCoId);
  if (!model) throw new Error(`Model "${id}" not found`);
  if (leaseHeldByOther(model)) {
    throw new Error(`Model "${id}" is locked by another editor`);
  }
  return { model, summary };
}

export async function uploadModelDocument(
  id: string,
  input: UploadDocumentInput,
): Promise<{ coId: string; size: number }> {
  const bytes =
    input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes);
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `File is too large (${bytes.byteLength} bytes); the limit is ${MAX_DOCUMENT_BYTES} bytes`,
    );
  }
  const { model, summary } = await requireWritableModel(id);

  // ArrayBuffer typing across DOM and Node lib varies; the underlying buffer
  // is interchangeable at runtime (same cast `uploadModelSvg` makes).
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const owner = model.$jazz.owner;
  const stream = await co.fileStream().createFromArrayBuffer(
    ab,
    input.mime,
    input.filename,
    { owner } as never,
  );

  const now = Date.now();
  const entry = DocumentCoMap.create(
    {
      documentId: input.documentId,
      kind: input.kind,
      mime: input.mime,
      filename: input.filename,
      size: bytes.byteLength,
      updatedAt: now,
      blob: stream as never,
    },
    owner as never,
  );

  // The record is optional on `ModelCoMap` so pre-attachment models load
  // unchanged; create it on first upload.
  let documents = model.documents as DocumentsRecord | null | undefined;
  if (!documents) {
    documents = DocumentsMap.create({}, owner as never) as unknown as DocumentsRecord;
    model.$jazz.set("documents", documents);
  }
  documents.$jazz.set(input.documentId, entry);
  model.$jazz.set("updatedAt", now);
  patchSummary(summary, { updatedAt: now });

  return { coId: (stream as { $jazz: { id: string } }).$jazz.id, size: bytes.byteLength };
}

/**
 * Fetch one attachment's bytes. Returns `null` when the id is unknown — a
 * legitimate answer, since a peer may have deleted it since the graph node was
 * written.
 */
export async function loadModelDocument(
  id: string,
  documentId: string,
): Promise<{ bytes: ArrayBuffer; mime: string; filename: string } | null> {
  const workspace = await requireWorkspace();
  const summary = workspace.modelSummaries?.[id];
  if (!summary) throw new Error(`Model "${id}" not found`);
  const model = await loadFullModel(summary.modelCoId);
  if (!model) throw new Error(`Model "${id}" not found`);

  const entry = (model.documents as DocumentsRecord | null | undefined)?.[documentId];
  if (!entry) return null;
  const blobRef = entry.$jazz.refs.blob;
  if (!blobRef) return null;
  const blob = await co.fileStream().loadAsBlob(blobRef.id);
  if (!blob) return null;
  return {
    bytes: await blob.arrayBuffer(),
    mime: entry.mime,
    filename: entry.filename,
  };
}

export async function deleteModelDocument(
  id: string,
  documentId: string,
): Promise<void> {
  const { model, summary } = await requireWritableModel(id);
  const documents = model.documents as DocumentsRecord | null | undefined;
  if (!documents?.[documentId]) return;
  if (typeof documents.$jazz.delete === "function") {
    documents.$jazz.delete(documentId);
  } else {
    documents.$jazz.set(documentId, undefined);
  }
  const now = Date.now();
  model.$jazz.set("updatedAt", now);
  patchSummary(summary, { updatedAt: now });
}

