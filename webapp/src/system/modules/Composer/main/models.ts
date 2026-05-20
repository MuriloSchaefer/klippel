import { co } from "jazz-tools";
import {
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
  editLease?: unknown;
  $jazz: { id: string; owner: unknown; refs: { svg?: unknown }; set: (k: string, v: unknown) => void };
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
    resolve: { editLease: { $onError: "catch" } },
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
