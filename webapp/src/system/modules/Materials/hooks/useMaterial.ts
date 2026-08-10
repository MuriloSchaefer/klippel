import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { selectMaterial } from "../store/materials/selectors";
import type { MaterialState } from "../store/materials/state";

/**
 * One material, by id — an O(1) read that re-renders the caller only when
 * *that* material changes.
 *
 * This is the default for row-level UI. Subscribing to the whole map instead
 * (`useMaterials()`) re-renders every consumer on every catalog tick, which is
 * what made a single peer edit re-render the entire Composer tree
 * (docs/analysis/materials-catalog-lag-analysis.md, F3).
 *
 * `undefined` is a legitimate answer: a material can be referenced by a graph
 * node before the catalog has loaded, or after another peer deleted it.
 */
export default function useMaterial(
  id: string | undefined,
): MaterialState | undefined {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  // Hooks can't be called conditionally, so an absent id reads through the
  // empty-string key, which no material can hold.
  return useAppSelector(selectMaterial(id ?? ""));
}
