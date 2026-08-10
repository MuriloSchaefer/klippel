import { createSlice } from "@reduxjs/toolkit";
import { PathLike } from "fs";

import {
  defineRehydration,
  workspaceStorage as storage,
} from "@kernel/modules/Store/workspaceScope";

import {
  materialsCatalogDeltaLoaded,
  materialsCatalogLoaded,
  materialTypeVersionRegistered,
} from "../materials/actions";
import type { MaterialTypeVersionDTO } from "../../typings/catalog";
import { MaterialType, MaterialTypeSchema, MaterialTypesState } from "./state";

export const MATERIAL_TYPES_SESSION_PATH = ".session/Materials/materialTypes";

storage.ensureDir(MATERIAL_TYPES_SESSION_PATH);

/**
 * Cache one material type under `.session/`.
 *
 * Jazz remains the authoritative store for the catalog — this is a
 * read-through cache that exists for one reason: a type must be in the
 * slice *before* the first surface that reads it paints. `MaterialSelector`
 * resolves `materialTypes[material.type]` during render, and the only other
 * populators (`materialsCatalogLoaded`, `materialTypeVersionRegistered`) are
 * an async IPC round-trip away, so a cold renderer had a window in which a
 * material was present with no type to describe it.
 *
 * Reverses the removal in `docs/changes/2026-05-24-a1f3c7-materials-jazz-only-storage.md`
 * for types only. Materials themselves stay Jazz-only: the ghost-row races
 * that motivated a1f3c7 come from *rows* going stale (a peer's delete
 * reappearing for a frame), and type schemas are additive — new versions are
 * appended, nothing is deleted — so a stale type entry is superseded by the
 * catalog load rather than contradicting it.
 */
export function persistMaterialType(state: MaterialType) {
  storage.ensureDir(MATERIAL_TYPES_SESSION_PATH);
  return storage.writeBlob(
    `${MATERIAL_TYPES_SESSION_PATH}/${state.name}.json`,
    new Blob([JSON.stringify(state)]),
    { encoding: "utf-8" },
  );
}

/**
 * Delete the session files of types that are no longer in state.
 *
 * Called only from the whole-session save (per repo `CLAUDE.md`: the writer
 * reconciles, it does not append). Types are additive today, so this rarely
 * has anything to do — but without it a type removed from the catalog would
 * come back on the next rehydrate.
 */
export async function pruneMaterialTypeFiles(liveNames: string[]) {
  const keep = new Set(liveNames.map((name) => `${name}.json`));
  try {
    const files = await storage.searchDir(
      MATERIAL_TYPES_SESSION_PATH,
      ["*.json"],
      { withFileTypes: true },
    );
    await Promise.all(
      files
        .filter((file) => !keep.has(file.name))
        .map((file) =>
          storage.deleteFile(`${MATERIAL_TYPES_SESSION_PATH}/${file.name}`),
        ),
    );
  } catch {
    // Nothing persisted yet — nothing to prune.
  }
}

const restoreMaterialTypesSession = async (
  sessionPath: PathLike = MATERIAL_TYPES_SESSION_PATH,
) => {
  try {
    const files = await storage.searchDir(sessionPath, ["*.json"], {
      withFileTypes: true,
    });
    const types = await files.reduce(async (acc, file) => {
      const fileContent = await storage.readFile<string>(
        `${sessionPath}/${file.name}`,
        { encoding: "utf-8" },
      );
      const content = JSON.parse(fileContent) as MaterialType;
      return { ...(await acc), [content.name]: content };
    }, {});
    return types as MaterialTypesState;
  } catch {
    // No cache for this workspace yet — the catalog load fills the slice.
    return {} as MaterialTypesState;
  }
};

export const materialTypesRehydrated = defineRehydration<MaterialTypesState>(
  "materialTypesSlice/rehydrated",
  restoreMaterialTypesSession,
);

/**
 * Merge catalog type versions (`${name}@${version}` → schema JSON) into the
 * renderer's `name → MaterialType` shape.
 *
 * Preserves existing state — never erases a type, only adds one or advances
 * its `latestSchema`. Shared by the full-snapshot and delta paths so the two
 * cannot drift.
 */
export function mergeTypeVersions(
  state: MaterialTypesState,
  versions: { [id: string]: MaterialTypeVersionDTO } | undefined,
): MaterialTypesState {
  const entries = Object.values(versions ?? {});
  if (!entries.length) return state;
  const next: MaterialTypesState = { ...state };
  for (const entry of entries) {
    const [name, version] = entry.id.split("@");
    if (!name || !version) continue;
    let schema: MaterialTypeSchema;
    try {
      schema = JSON.parse(entry.schemaJson) as MaterialTypeSchema;
    } catch {
      continue;
    }
    const existing = next[name];
    // `latestSchema` advances if the incoming version is numerically
    // greater (lexicographic compare is fine for the `x.y.z` patches used
    // so far; revisit if non-numeric segments are introduced).
    const latest =
      !existing?.latestSchema || version > existing.latestSchema
        ? version
        : existing.latestSchema;
    next[name] = {
      name,
      label: existing?.label ?? name,
      latestSchema: latest,
      schemas: {
        ...(existing?.schemas ?? {}),
        [version]: schema,
      },
    };
  }
  return next;
}

const slice = createSlice({
    name: 'materialTypesSlice',
    initialState: await restoreMaterialTypesSession(),
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        materialTypesRehydrated,
        (state: MaterialTypesState, { payload }) => {
          // Merges rather than replaces, matching `materialsCatalogLoaded`
          // below: never erase a type, only add or advance one. A workspace
          // switch runs the rehydrators *before* `workspaceSelected` fires
          // the catalog load, so replacing with an empty payload — a
          // workspace with no cache yet — would reopen the very window this
          // rehydrator closes. The cost is that a type absent from the new
          // workspace's cache lingers from the previous one until the
          // catalog load lands; describing a type that no material
          // references is inert, whereas the reverse crashes the render.
          return { ...state, ...payload };
        },
      );
      builder.addCase(
        materialsCatalogLoaded,
        // Catalog snapshots carry `materialTypes` keyed by
        // `${name}@${version}` with the schema body as JSON, so a peer can
        // rehydrate types it didn't author locally (the other side of
        // `materialTypeVersionRegistered`'s optimistic local update).
        (state: MaterialTypesState, { payload }) =>
          mergeTypeVersions(state, payload.materialTypes),
      );
      builder.addCase(
        materialsCatalogDeltaLoaded,
        (state: MaterialTypesState, { payload }) =>
          mergeTypeVersions(
            state,
            payload.full ? payload.full.materialTypes : payload.materialTypes,
          ),
      );
      builder.addCase(
        materialTypeVersionRegistered,
        (state: MaterialTypesState, { payload }) => {
          // Merge the new schema version into the existing type, or
          // create the type entry on first registration. `latestSchema`
          // moves forward to the just-registered version — callers
          // create new versions chronologically.
          let schema: MaterialTypeSchema;
          try {
            schema = JSON.parse(payload.schemaJson) as MaterialTypeSchema;
          } catch {
            return state;
          }
          const existing = state[payload.name];
          return {
            ...state,
            [payload.name]: {
              name: payload.name,
              label: existing?.label ?? payload.name,
              latestSchema: payload.version,
              schemas: {
                ...(existing?.schemas ?? {}),
                [payload.version]: schema,
              },
            },
          };
        },
      );
    }
})

export default slice;