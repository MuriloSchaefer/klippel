/**
 * Composer's model IPC entry points.
 *
 * Phase 3 of `src/docs/analysis/post-jazz-storage-study.md`: SQLite is the
 * store of record for models, their SVG and their attachments. Jazz is read
 * once per workspace, by the projection, and never written.
 *
 * Same channels, same DTOs. The one semantic change is the edit lease, which
 * is now local to this peer — see `modelsDb.ts`.
 */
import { getActiveWorkspace } from "../../../../../electron/main/jazz";
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

export async function createModel(
  input: CreateModelInput,
): Promise<ModelSummaryDTO> {
  return store.createModel(await ready(), input);
}

export async function updateModelGraph(
  id: string,
  graphJson: string,
): Promise<void> {
  store.updateModelGraph(await ready(), id, graphJson, currentAccountId());
}

export async function updateModelDescription(
  id: string,
  description: string,
): Promise<void> {
  store.updateModelDescription(await ready(), id, description);
}

export async function acquireEditLease(id: string): Promise<EditLeaseSnapshot> {
  return store.acquireLease(await ready(), id, currentAccountId());
}

export async function renewEditLease(id: string): Promise<EditLeaseSnapshot> {
  return store.renewLease(await ready(), id, currentAccountId());
}

export async function releaseEditLease(id: string): Promise<void> {
  store.releaseLease(await ready(), id, currentAccountId());
}

export async function uploadModelSvg(
  id: string,
  svgContent: string,
): Promise<{ coId: string }> {
  return store.saveModelSvg(await ready(), id, svgContent, currentAccountId());
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
  return store.saveModelDocument(
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
}

/** Every model's graph — what the material-usage projection walks. */
export async function allModelGraphs(): Promise<
  Array<{ id: string; graphJson: string }>
> {
  return store.allModelGraphs(await ready());
}
