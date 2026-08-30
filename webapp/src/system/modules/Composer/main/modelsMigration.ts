/**
 * One-way projection of a workspace's Jazz models into SQLite.
 *
 * The counterpart of `Materials/main/catalogMigration.ts`, and the same
 * bargain: it runs once per workspace, it is the last thing that reads the
 * CoValues, and it never writes or deletes `jazz.sqlite` — the old store stays
 * as the fallback until the new one has earned its keep.
 *
 * Models are projected whole (a graph is one string, and there is no windowing
 * to be had), attachments with their bytes, and the SVG as text.
 */
import { prepare, workspaceDb } from "../../../../../electron/main/db";
import { storageId } from "../../../../../electron/main/db/ids";
import { SQL } from "./queries";
import { countModels } from "./modelsDb";
import { listModels as listJazzModels, loadJazzModelForMigration } from "./models";

export interface ModelsMigrationResult {
  ran: boolean;
  models: number;
  documents: number;
  ms: number;
}

let inFlight: Promise<ModelsMigrationResult> | null = null;
const projected = new Set<string>();

export async function ensureModelsProjected(
  workspace: string,
): Promise<ModelsMigrationResult> {
  if (projected.has(workspace)) {
    return { ran: false, models: 0, documents: 0, ms: 0 };
  }
  if (inFlight) return inFlight;
  inFlight = project(workspace);
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

async function project(workspace: string): Promise<ModelsMigrationResult> {
  const startedAt = Date.now();
  if (countModels(workspace) > 0) {
    projected.add(workspace);
    return { ran: false, models: 0, documents: 0, ms: 0 };
  }

  let summaries: Awaited<ReturnType<typeof listJazzModels>>;
  try {
    summaries = await listJazzModels();
  } catch (err) {
    // No Jazz workspace (a fresh one, or a store that never had models) is not
    // an error — there is simply nothing to carry across.
    console.log("[models-migration] nothing to project", String(err));
    projected.add(workspace);
    return { ran: false, models: 0, documents: 0, ms: 0 };
  }

  const db = workspaceDb(workspace).db;
  const upsertModel = prepare(db, SQL.upsertModel);
  const upsertDocument = prepare(db, SQL.upsertDocument);
  let documents = 0;

  for (const summary of summaries) {
    // eslint-disable-next-line no-await-in-loop
    const loaded = await loadJazzModelForMigration(summary.id);
    if (!loaded) continue;
    upsertModel.run({
      id: storageId("model", summary.id),
      model_key: summary.id,
      name: loaded.name,
      description: loaded.description,
      graph_json: loaded.graphJson || "{}",
      svg: loaded.svg ?? "",
      updated_at: loaded.updatedAt,
    });
    for (const doc of loaded.documents) {
      upsertDocument.run({
        id: storageId("modelDocument", `${summary.id}/${doc.documentId}`),
        document_key: doc.documentId,
        model_key: summary.id,
        kind: doc.kind,
        mime: doc.mime,
        filename: doc.filename,
        size: doc.size,
        bytes: doc.bytes,
        updated_at: doc.updatedAt,
      });
      documents += 1;
    }
  }

  projected.add(workspace);
  const result = {
    ran: true,
    models: summaries.length,
    documents,
    ms: Date.now() - startedAt,
  };
  console.log(
    `[models-migration] projected ${result.models} models / ` +
      `${result.documents} documents into SQLite in ${result.ms}ms`,
  );
  return result;
}

/** Forget that this process projected anything — a workspace switch. */
export function resetModelsMigration(): void {
  inFlight = null;
  projected.clear();
}
