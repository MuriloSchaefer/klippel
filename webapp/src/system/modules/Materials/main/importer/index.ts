/**
 * Main-process xlsx importer for the materials catalog.
 *
 * The renderer hands a workbook over via the `materials:import-xlsx`
 * IPC; this module parses it off the renderer thread, writes each row
 * to the workspace's Jazz catalog through the same `addMaterial` /
 * `registerMaterialTypeVersion` functions a user click would invoke,
 * and pushes a single `materials:import-finished` event when done.
 *
 * One in-flight job at a time. Live updates ride on the existing
 * `onCatalogChange` channel — no bespoke streaming protocol.
 */
import { randomUUID } from "node:crypto";

import {
  addMaterial as catalogAddMaterial,
  loadMaterialsCatalog,
  registerMaterialTypeVersion as catalogRegisterTypeVersion,
} from "../materials";
import { recordEntry as recordSyncLog } from "../../../../../../electron/main/jazzLogBuffer";
import { parseWorkbook, type ParseError } from "./parser";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const CHUNK_SIZE = 25;

export interface ImportSkip {
  kind: "type" | "material";
  id: string;
  reason: string;
}

export interface ImportFinishedEvent {
  jobId: string;
  ok: boolean;
  addedTypes: number;
  addedMaterials: number;
  skipped: ImportSkip[];
  errors: ParseError[];
  /** Top-level error code when `ok === false`. */
  errorCode?:
    | "import_in_flight"
    | "payload_too_large"
    | "no_active_workspace"
    | "catalog_read_failed"
    | "internal_error";
  errorMessage?: string;
}

type Listener = (event: ImportFinishedEvent) => void;
const listeners = new Set<Listener>();

export const onImportFinished = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const emit = (event: ImportFinishedEvent): void => {
  recordSyncLog(
    event.ok ? "info" : "error",
    `[materials/import] ${event.jobId} ${event.ok ? "ok" : "failed"}`,
    {
      addedTypes: event.addedTypes,
      addedMaterials: event.addedMaterials,
      skipped: event.skipped.length,
      errors: event.errors.length,
      errorCode: event.errorCode,
    },
  );
  for (const l of listeners) {
    try { l(event); } catch (err) {
      console.error("[materials/import] listener threw", err);
    }
  }
};

let inFlight = false;

const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const run = async (jobId: string, buffer: ArrayBuffer): Promise<void> => {
  const skipped: ImportSkip[] = [];
  let addedTypes = 0;
  let addedMaterials = 0;

  // 1. Parse off the renderer thread.
  const parsed = parseWorkbook(buffer);

  // 2. Snapshot the catalog so we can compute skip-sets up front.
  //    A second pre-existence check happens inside `catalogAddMaterial`
  //    / `registerMaterialTypeVersion`; treat this as the cheap path
  //    and let the IPC layer be the backstop.
  let existingTypeIds = new Set<string>();
  let existingMaterialIds = new Set<string>();
  try {
    const snapshot = await loadMaterialsCatalog();
    existingTypeIds = new Set(Object.keys(snapshot.materialTypes));
    existingMaterialIds = new Set(Object.keys(snapshot.materials));
  } catch (err) {
    emit({
      jobId,
      ok: false,
      addedTypes: 0,
      addedMaterials: 0,
      skipped,
      errors: parsed.errors,
      errorCode: "catalog_read_failed",
      errorMessage: (err as Error).message ?? String(err),
    });
    return;
  }

  // 3. Types first — materials reference them by `typeVersion`.
  for (const t of parsed.types) {
    if (existingTypeIds.has(t.id)) {
      skipped.push({ kind: "type", id: t.id, reason: "already exists" });
      continue;
    }
    try {
      await catalogRegisterTypeVersion(t);
      existingTypeIds.add(t.id);
      addedTypes += 1;
    } catch (err) {
      parsed.errors.push({
        sheet: "MaterialTypes",
        row: 0,
        message: `${t.id}: ${(err as Error).message ?? String(err)}`,
      });
    }
  }

  // 4. Materials in chunks, yielding between chunks so cojson sync
  //    flushes and IPC ticks (Atualizar, other materials reads) can
  //    interleave.
  for (let i = 0; i < parsed.materials.length; i += CHUNK_SIZE) {
    const chunk = parsed.materials.slice(i, i + CHUNK_SIZE);
    for (const input of chunk) {
      const id = input.material.id;
      if (existingMaterialIds.has(id)) {
        skipped.push({ kind: "material", id, reason: "already exists" });
        continue;
      }
      // If the referenced typeVersion isn't in the catalog and wasn't
      // added in this run, skip with a clear reason — `addMaterial`
      // would otherwise throw on the missing conformsTo target.
      if (!existingTypeIds.has(input.typeVersion)) {
        skipped.push({
          kind: "material",
          id,
          reason: `unknown typeVersion ${input.typeVersion}`,
        });
        continue;
      }
      try {
        await catalogAddMaterial(input);
        existingMaterialIds.add(id);
        addedMaterials += 1;
      } catch (err) {
        parsed.errors.push({
          sheet: "Materials",
          row: 0,
          message: `${id}: ${(err as Error).message ?? String(err)}`,
        });
      }
    }
    await yieldToEventLoop();
  }

  emit({
    jobId,
    ok: true,
    addedTypes,
    addedMaterials,
    skipped,
    errors: parsed.errors,
  });
};

export interface StartImportResult {
  jobId: string;
}

/**
 * Schedule a workbook import. Returns synchronously with the job id;
 * the actual parse + write loop runs on the next `setImmediate` tick
 * so the IPC handler unblocks before any heavy work starts.
 */
export const runImportXlsx = (buffer: ArrayBuffer): StartImportResult => {
  if (inFlight) {
    const jobId = randomUUID();
    setImmediate(() =>
      emit({
        jobId,
        ok: false,
        addedTypes: 0,
        addedMaterials: 0,
        skipped: [],
        errors: [],
        errorCode: "import_in_flight",
        errorMessage: "Another import job is already running",
      }),
    );
    return { jobId };
  }
  if (buffer.byteLength > MAX_BYTES) {
    const jobId = randomUUID();
    setImmediate(() =>
      emit({
        jobId,
        ok: false,
        addedTypes: 0,
        addedMaterials: 0,
        skipped: [],
        errors: [],
        errorCode: "payload_too_large",
        errorMessage: `Workbook exceeds ${MAX_BYTES} bytes`,
      }),
    );
    return { jobId };
  }
  const jobId = randomUUID();
  inFlight = true;
  setImmediate(async () => {
    try {
      await run(jobId, buffer);
    } catch (err) {
      emit({
        jobId,
        ok: false,
        addedTypes: 0,
        addedMaterials: 0,
        skipped: [],
        errors: [],
        errorCode: "internal_error",
        errorMessage: (err as Error).message ?? String(err),
      });
    } finally {
      inFlight = false;
    }
  });
  return { jobId };
};
