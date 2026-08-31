/**
 * Composer's model IPC entry points.
 *
 * Phase 3 of `src/docs/analysis/post-jazz-storage-study.md`: SQLite is the
 * store of record for models, their SVG and their attachments. Jazz is read
 * once per workspace, by the projection, and never written.
 *
 * Same channels, same DTOs. Writes also put themselves on the wire — see
 * `afterWrite` below.
 */
import { getActiveWorkspace } from "../../../../../electron/main/jazz";
import { pushLocalChanges } from "../../../../../electron/main/sync";
import * as store from "./modelsDb";
import { MAX_DOCUMENT_BYTES } from "./modelsDb";
import { ensureModelsProjected } from "./modelsMigration";
import type { UploadDocumentInput } from "./models";
import type {
  CreateModelInput,
  EditLeaseSnapshot,
  LoadedModel,
  ModelSummary as ModelSummaryDTO,
} from "../typings";

function requireWorkspaceName(): string {
  const active = getActiveWorkspace();
  if (!active) throw new Error("No active workspace");
  return active.name;
}

/**
 * The account a write is attributed to.
 *
 * Still Jazz's, because identity has not moved yet — that is phase 4. When it
 * does, this is the one place that has to change.
 */
function currentAccountId(): string {
  const active = getActiveWorkspace();
  const account = active?.context.account as unknown as
    | { $jazz?: { id?: string } }
    | undefined;
  return account?.$jazz?.id ?? "unknown";
}

async function ready(): Promise<string> {
  const workspace = requireWorkspaceName();
  await ensureModelsProjected(workspace);
  return workspace;
}

export async function listModels(): Promise<ModelSummaryDTO[]> {
  return store.listModels(await ready());
}

export async function loadModel(id: string): Promise<LoadedModel | null> {
  return store.loadModel(await ready(), id);
}

/**
 * Put this peer's writes on the wire.
 *
 * Every model mutation goes through here rather than each one remembering to:
 * a write that reaches SQLite but never the relay is invisible to everyone
 * else, and that failure is silent on the writing peer.
 */
function afterWrite(): void {
  pushLocalChanges();
}

export async function createModel(
  input: CreateModelInput,
): Promise<ModelSummaryDTO> {
  const summary = store.createModel(await ready(), input);
  afterWrite();
  return summary;
}

export async function updateModelGraph(
  id: string,
  graphJson: string,
): Promise<void> {
  store.updateModelGraph(await ready(), id, graphJson, currentAccountId());
  afterWrite();
}

export async function updateModelDescription(
  id: string,
  description: string,
): Promise<void> {
  store.updateModelDescription(await ready(), id, description);
  afterWrite();
}

export async function acquireEditLease(id: string): Promise<EditLeaseSnapshot> {
  const lease = store.acquireLease(await ready(), id, currentAccountId());
  // Push immediately: a lock the other peer learns about a minute from now is
  // not a lock, and the whole point of taking it is that someone else stops.
  afterWrite();
  return lease;
}

export async function renewEditLease(id: string): Promise<EditLeaseSnapshot> {
  const lease = store.renewLease(await ready(), id, currentAccountId());
  afterWrite();
  return lease;
}

export async function releaseEditLease(id: string): Promise<void> {
  store.releaseLease(await ready(), id, currentAccountId());
  // A release that does not reach the other peer leaves the model locked for
  // the rest of the TTL, for no reason.
  afterWrite();
}

export async function uploadModelSvg(
  id: string,
  svgContent: string,
): Promise<{ coId: string }> {
  const result = store.saveModelSvg(await ready(), id, svgContent, currentAccountId());
  afterWrite();
  return result;
}

export async function loadModelSvg(id: string): Promise<string | null> {
  return store.loadModelSvg(await ready(), id);
}

export async function uploadModelDocument(
  id: string,
  input: UploadDocumentInput,
): Promise<{ coId: string; size: number }> {
  const bytes =
    input.bytes instanceof Uint8Array
      ? input.bytes
      : new Uint8Array(input.bytes);
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `Attachment "${input.filename}" is ${bytes.byteLength} bytes, over the ` +
        `${MAX_DOCUMENT_BYTES} byte limit`,
    );
  }
  const result = store.saveModelDocument(
    await ready(),
    id,
    {
      documentId: input.documentId,
      kind: input.kind,
      mime: input.mime,
      filename: input.filename,
      size: bytes.byteLength,
      bytes,
    },
    currentAccountId(),
  );
  afterWrite();
  return result;
}

export async function loadModelDocument(
  id: string,
  documentId: string,
): Promise<{ bytes: ArrayBuffer; mime: string; filename: string } | null> {
  return store.loadModelDocument(await ready(), id, documentId);
}

export async function deleteModelDocument(
  id: string,
  documentId: string,
): Promise<void> {
  store.deleteModelDocument(await ready(), id, documentId, currentAccountId());
  afterWrite();
}

/** Every model's graph — what the material-usage projection walks. */
export async function allModelGraphs(): Promise<
  Array<{ id: string; graphJson: string }>
> {
  return store.allModelGraphs(await ready());
}
