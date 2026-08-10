import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import {
  selectMaterials,
  selectMaterialsByIds,
} from "../store/materials/selectors";
import { useMemo } from "react";

/**
 * Subscribe to the materials catalog.
 *
 * Pass the ids you need. Omitting them subscribes to the **whole** catalog,
 * which means re-rendering on every catalog tick — at scale that is the
 * expensive path (docs/analysis/materials-catalog-lag-analysis.md, F3), so
 * prefer `useMaterial(id)` or an id list wherever the caller knows what it
 * wants.
 *
 * The previous id-filtering branch never narrowed anything: it iterated the
 * requested ids and asked whether each was in that same list — always true —
 * so `useMaterials(['x'])` returned the entire map (F4). It also mutated the
 * live Redux state object via `delete` on the way. Both are gone; the
 * projection now happens in a memoized selector cached on the id list.
 */
export default function (materials?: string[]) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  // Callers routinely pass a fresh array literal (`[materialId]`), so memoize
  // on the joined key rather than the array identity — otherwise this rebuilds
  // every render and the selector cache never pays off. NUL is the separator
  // because ids come verbatim from the imported spreadsheet and may contain
  // spaces.
  const idsKey = materials?.join("\u0000");
  const selector = useMemo(
    () =>
      idsKey === undefined
        ? selectMaterials()
        : selectMaterialsByIds(idsKey === "" ? [] : idsKey.split("\u0000")),
    [idsKey],
  );

  return useAppSelector(selector);
}
