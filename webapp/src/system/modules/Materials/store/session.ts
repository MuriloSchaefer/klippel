import type { Store } from "@reduxjs/toolkit";

import { MODULE_NAME } from "../constants";
import { MaterialsModuleState } from "./state";
import {
  persistMaterialType,
  pruneMaterialTypeFiles,
} from "./materialTypes/slice";

/**
 * Write the Materials slice's cacheable state to `.session/`, as a snapshot of
 * this instant.
 *
 * The **only** path from Materials state to disk. `registerMaterialTypeVersion`
 * and the catalog load deliberately do not persist — a session file set
 * represents a point in time the user chose, not a running log of every edit
 * (`CLAUDE.md`, e2e-tests.md §12).
 *
 * Only `materialTypes` is cached. Materials, industries and sellers stay
 * Jazz-only per `docs/changes/2026-05-24-a1f3c7-materials-jazz-only-storage.md`
 * — see `materialTypes/slice.ts` for why types are the exception.
 *
 * Reconciles rather than merely writing: types removed since the last save
 * have their files pruned, otherwise they would return on the next rehydrate.
 */
export const persistMaterialsSession = async (state: MaterialsModuleState) => {
  const types = Object.values(state?.materialTypes ?? {});
  await Promise.all(types.map(persistMaterialType));
  await pruneMaterialTypeFiles(types.map((type) => type.name));
};

/**
 * The module's whole-session writer, registered with
 * `storage.registerSessionSaveListener` in `kernelCalls.ts`.
 *
 * Unlike the modules that dispatch a `saveSession` action, this writes
 * directly: there is no reducer or middleware involvement in caching types, so
 * an action pair would only add indirection. Being async, it also gives the
 * kernel its await for free — `storage.saveSession()` resolves once the
 * snapshot is actually on disk, so an e2e test (or a reload) that follows a
 * save does not race the write.
 */
export const sessionSaver =
  (store: Store<{ [MODULE_NAME]: MaterialsModuleState }>) => async () => {
    await persistMaterialsSession(store.getState()[MODULE_NAME]);
  };
