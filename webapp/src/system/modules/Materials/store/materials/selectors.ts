import { createSelector } from "reselect";
import { MaterialsModuleState } from "../state";
import { MaterialsState, MaterialState } from "./state";
import type { MaterialTypesState } from "../materialTypes/state";

export type MaterialSelector = (state: MaterialsState) => MaterialsState;

const selectMaterialsModule = (state: { Materials: MaterialsModuleState }) => state.Materials;
const selectMaterialsState = createSelector(
  selectMaterialsModule,
  (state: MaterialsModuleState | undefined) => state?.materials
);

export const selectMaterials = (selector?: MaterialSelector) => {
  if (!selector) return selectMaterialsState;

  return createSelector(
    selectMaterialsState,
    (materials: MaterialsState | undefined) => materials ? selector(materials) : undefined
  );
};

const EMPTY_MATERIALS: MaterialState[] = [];

/**
 * Is this row pinned to something older than its type's latest schema?
 *
 * The comparison is against `latestSchema` — the version the type itself
 * says is current — not against "any newer version exists", because a type
 * whose successor has not synced yet must not mark every row outdated.
 * A row whose type is not resident answers `false`: unknown is not outdated.
 */
export const isOutdated = (
  material: MaterialState | undefined,
  materialTypes: MaterialTypesState | undefined,
): boolean => {
  if (!material) return false;
  const latest = materialTypes?.[material.type]?.latestSchema;
  if (!latest) return false;
  return Boolean(material.schemaVersion) && material.schemaVersion !== latest;
};

/**
 * Per-argument selector caches.
 *
 * `createSelector` memoizes on its *inputs*, so a selector rebuilt on every
 * render memoizes nothing — the recompute runs again each time. Caching the
 * built selector per argument is what makes these actually cheap; without it
 * the O(1) reads below degrade to O(catalog) per render.
 *
 * Keys are ids / type names, both bounded by the catalog, so the caches
 * cannot grow beyond it.
 */
const byIdCache = new Map<string, ReturnType<typeof buildSelectMaterial>>();
const byTypeCache = new Map<string, ReturnType<typeof buildSelectMaterialsByType>>();
const byIdsCache = new Map<string, ReturnType<typeof buildSelectMaterialsByIds>>();

function buildSelectMaterial(id: string) {
  return createSelector(
    selectMaterialsState,
    (materials: MaterialsState | undefined) => materials?.[id],
  );
}

/** O(1) read of a single material. The scale-safe default for row-level UI. */
export const selectMaterial = (id: string) => {
  let selector = byIdCache.get(id);
  if (!selector) {
    selector = buildSelectMaterial(id);
    byIdCache.set(id, selector);
  }
  return selector;
};

function buildSelectMaterialsByType(type: string) {
  return createSelector(
    selectMaterialsState,
    (materials: MaterialsState | undefined) => {
      if (!materials) return EMPTY_MATERIALS;
      const out: MaterialState[] = [];
      for (const material of Object.values(materials)) {
        if (material.type === type) out.push(material);
      }
      return out.length ? out : EMPTY_MATERIALS;
    },
  );
}

/**
 * All materials of one type, as an array. Recomputes only when the catalog
 * slice actually changes — not on every render of every selector component.
 */
export const selectMaterialsByType = (type: string) => {
  let selector = byTypeCache.get(type);
  if (!selector) {
    selector = buildSelectMaterialsByType(type);
    byTypeCache.set(type, selector);
  }
  return selector;
};

function buildSelectMaterialsByIds(ids: readonly string[]) {
  return createSelector(
    selectMaterialsState,
    (materials: MaterialsState | undefined) => {
      const out: MaterialsState = {};
      if (!materials) return out;
      for (const id of ids) {
        const material = materials[id];
        if (material) out[id] = material;
      }
      return out;
    },
  );
};

/**
 * Projection of just the requested ids. Cached on the joined id list, so a
 * caller passing a fresh array literal each render still reuses one selector
 * — otherwise the memo never holds and every render rebuilds the projection.
 */
export const selectMaterialsByIds = (ids: readonly string[]) => {
  const key = ids.join("\u0000");
  let selector = byIdsCache.get(key);
  if (!selector) {
    // Unlike the id/type caches this one is keyed on a *combination*, which is
    // unbounded in principle. Callers pass either a single id or a variation's
    // material set, so the live working set is small; drop the cache wholesale
    // if it ever grows past that rather than leak.
    if (byIdsCache.size > 512) byIdsCache.clear();
    selector = buildSelectMaterialsByIds([...ids]);
    byIdsCache.set(key, selector);
  }
  return selector;
};
