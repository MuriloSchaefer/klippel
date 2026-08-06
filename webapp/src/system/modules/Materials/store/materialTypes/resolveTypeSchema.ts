import type { MaterialType, MaterialTypeSchema } from "./state";

/**
 * Resolve the schema that governs a material's *type-level* settings —
 * currently `stockUnit` and `consumptionUnit`.
 *
 * The type's **latest** schema wins, not the version the material pins.
 * A pinned `schemaVersion` records which attribute set the material's
 * data conforms to; the units are a preference about how the type is
 * measured and reported, so changing one should take effect across the
 * catalog immediately rather than waiting for every row to be re-saved
 * onto a successor version.
 *
 * Falls back to the pinned version when the type has no `latestSchema`
 * entry (a catalog that synced a material ahead of its type).
 */
export const resolveTypeSchema = (
  type: MaterialType | undefined,
  pinnedVersion?: string,
): MaterialTypeSchema | undefined => {
  if (!type) return undefined;
  const latest = type.latestSchema
    ? type.schemas?.[type.latestSchema]
    : undefined;
  if (latest) return latest;
  return pinnedVersion ? type.schemas?.[pinnedVersion] : undefined;
};
