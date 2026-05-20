import { co } from "jazz-tools";
import {
  EditLease,
  ModelCoMap,
  WorkspaceCoMap,
} from "../../../../kernel/modules/Store/schema";
import { getActiveWorkspace } from "../../../../../electron/main/jazz";
import type {
  CreateModelInput,
  EditLeaseSnapshot,
  LoadedModel,
  ModelSummary,
} from "../typings";

const LEASE_TTL_MS = 60_000;

async function requireWorkspace() {
  const active = getActiveWorkspace();
  if (!active) throw new Error("No active workspace");
  if (!active.coId) throw new Error("Active workspace has no coId");
  const settled = await WorkspaceCoMap.load(active.coId, {
    resolve: {
      models: { $each: { editLease: { $onError: "catch" } } },
    },
  });
  if (!settled || ("$isLoaded" in settled && settled.$isLoaded === false)) {
    throw new Error(`Could not load workspace ${active.coId}`);
  }
  return settled as Exclude<typeof settled, { $isLoaded: false }>;
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

/**
 * Normalize the `MaybeLoaded<EditLease>` we get from the resolved query into
 * either a fully loaded lease or `undefined`. `$onError: "catch"` lets a
 * missing/unauthorized lease through as a NotLoaded record; we treat both as
 * "no usable lease" since Phase 2a doesn't depend on knowing why it's absent.
 */
function loadedLease(model: { editLease?: unknown }): LoadedLease | undefined {
  const lease = model.editLease as
    | (LoadedLease & { $isLoaded?: boolean })
    | { $isLoaded: false }
    | undefined;
  if (!lease) return undefined;
  if ("$isLoaded" in lease && lease.$isLoaded === false) return undefined;
  return lease as LoadedLease;
}

/**
 * Discriminate the `MaybeLoaded<Model>` we get from `$each: $onError: "catch"`.
 * An in-flight or unauthorized model surfaces as `{ $isLoaded: false }`; skip
 * it so a single slow entry does not blank the entire renderer model list.
 * The next `listModels` call after sync settles will include it.
 */
function isLoadedModel<T>(model: unknown): model is T {
  if (!model || typeof model !== "object") return false;
  return !("$isLoaded" in model && (model as { $isLoaded: boolean }).$isLoaded === false);
}

function leaseHeldByOther(model: { editLease?: unknown }): boolean {
  const lease = loadedLease(model);
  if (!lease) return false;
  if (lease.expiresAt < Date.now()) return false;
  return lease.holderAccountId !== currentAccountId();
}

export async function listModels(): Promise<ModelSummary[]> {
  const workspace = await requireWorkspace();
  const out: ModelSummary[] = [];
  for (const [id, candidate] of Object.entries(workspace.models)) {
    if (!isLoadedModel<{
      name: string;
      description: string;
      updatedAt: number;
      $jazz: { id: string; refs: { svg?: unknown } };
    }>(candidate)) continue;
    out.push({
      id,
      coId: candidate.$jazz.id,
      name: candidate.name,
      description: candidate.description,
      hasSvg: candidate.$jazz.refs.svg !== undefined,
      updatedAt: candidate.updatedAt,
    });
  }
  return out;
}

export async function loadModel(id: string): Promise<LoadedModel | null> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
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

export async function createModel(input: CreateModelInput): Promise<ModelSummary> {
  const workspace = await requireWorkspace();
  if (workspace.models[input.id]) {
    throw new Error(`Model "${input.id}" already exists`);
  }
  const owner = workspace.$jazz.owner;
  const model = ModelCoMap.create(
    {
      id: input.id,
      name: input.name,
      description: input.description ?? "",
      graphJson: input.graphJson,
      updatedAt: Date.now(),
    },
    owner,
  );
  workspace.models.$jazz.set(input.id, model);
  return {
    id: model.id,
    coId: model.$jazz.id,
    name: model.name,
    description: model.description,
    hasSvg: false,
    updatedAt: model.updatedAt,
  };
}

export async function updateModelGraph(id: string, graphJson: string): Promise<void> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  if (leaseHeldByOther(model)) {
    throw new Error(`Model "${id}" is locked by another editor`);
  }
  model.$jazz.set("graphJson", graphJson);
  model.$jazz.set("updatedAt", Date.now());
}

export async function updateModelDescription(id: string, description: string): Promise<void> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  model.$jazz.set("description", description);
  model.$jazz.set("updatedAt", Date.now());
}

export async function acquireEditLease(id: string): Promise<EditLeaseSnapshot> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  const existing = loadedLease(model);
  if (existing && existing.expiresAt >= Date.now() && existing.holderAccountId !== currentAccountId()) {
    throw new Error(`Model "${id}" is locked by ${existing.holderAccountId}`);
  }
  const now = Date.now();
  const owner = model.$jazz.owner;
  const lease = EditLease.create(
    {
      holderAccountId: currentAccountId(),
      acquiredAt: now,
      expiresAt: now + LEASE_TTL_MS,
    },
    owner,
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
  const model = workspace.models[id];
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
  const model = workspace.models[id];
  if (!model) return;
  const lease = loadedLease(model);
  if (!lease || lease.holderAccountId !== currentAccountId()) return;
  model.$jazz.set("editLease", undefined);
}

/**
 * Upload an SVG payload as a BinaryCoStream attached to `ModelCoMap.svg`.
 * The renderer hands us the raw markup string; we transcode to bytes and
 * delegate to Jazz's chunked stream writer. Sanitization is the renderer's
 * job (DOMPurify) — main-process is content-agnostic.
 */
export async function uploadModelSvg(id: string, svgContent: string): Promise<{ coId: string }> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  if (leaseHeldByOther(model)) {
    throw new Error(`Model "${id}" is locked by another editor`);
  }
  const bytes = new TextEncoder().encode(svgContent);
  // ArrayBuffer typing across DOM and Node lib varies; the underlying buffer
  // is interchangeable at runtime.
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const owner = model.$jazz.owner;
  const stream = await co.fileStream().createFromArrayBuffer(
    ab,
    "image/svg+xml",
    `${id}.svg`,
    { owner },
  );
  model.$jazz.set("svg", stream);
  model.$jazz.set("updatedAt", Date.now());
  return { coId: stream.$jazz.id };
}

/**
 * Read the SVG BinaryCoStream attached to a model back to a UTF-8 string.
 * Returns `null` if the model has no SVG yet.
 */
export async function loadModelSvg(id: string): Promise<string | null> {
  const workspace = await requireWorkspace();
  const model = workspace.models[id];
  if (!model) throw new Error(`Model "${id}" not found`);
  const svgRef = model.$jazz.refs.svg;
  if (!svgRef) return null;
  const blob = await co.fileStream().loadAsBlob(svgRef.id);
  if (!blob) return null;
  return new TextDecoder().decode(await blob.arrayBuffer());
}
