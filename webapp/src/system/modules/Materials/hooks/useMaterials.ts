import { useEffect, useMemo } from "react";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { ensureMaterialsLoaded } from "../store/materials/actions";
import {
  selectMaterials,
  selectMaterialsByIds,
} from "../store/materials/selectors";
import type { MaterialsState } from "../store/materials/state";

/**
 * Id-list separator. NUL, because ids come verbatim from the imported
 * spreadsheet and may contain spaces.
 */
const SEP = "\u0000";

/**
 * Subscribe to the materials catalog.
 *
 * Pass the ids you need. Omitting them subscribes to the **whole** catalog,
 * which means re-rendering on every catalog tick — at scale that is the
 * expensive path (docs/analysis/materials-catalog-lag-analysis.md, F3), so
 * prefer `useMaterial(id)` or an id list wherever the caller knows what it
 * wants.
 *
 * With ids, the hook **resolves the ones the mirror does not hold**. It does
 * *not* claim residency: protection belongs to whoever owns the surface — a
 * variation pins the materials it references, the stock grid retains what it
 * renders — and retaining here as well meant every accordion, process row and
 * picker in an open model dispatched a retain (and a release) over the same
 * already-pinned ids. Callers that really do own protection say so with
 * `useRetainedMaterials`.
 *
 * The previous id-filtering branch never narrowed anything: it iterated the
 * requested ids and asked whether each was in that same list — always true —
 * so `useMaterials(['x'])` returned the entire map (F4). It also mutated the
 * live Redux state object via `delete` on the way. Both are gone; the
 * projection now happens in a memoized selector cached on the id list.
 */
export default function (materials?: string[]) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector, useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();

  // Callers routinely pass a fresh array literal (`[materialId]`), so memoize
  // on the joined key rather than the array identity — otherwise this rebuilds
  // every render and the selector cache never pays off. NUL is the separator
  // because ids come verbatim from the imported spreadsheet and may contain
  // spaces.
  const idsKey = materials?.join("\u0000");
  const ids = useMemo(
    () => (idsKey === undefined || idsKey === "" ? [] : idsKey.split("\u0000")),
    [idsKey],
  );
  const selector = useMemo(
    () => (idsKey === undefined ? selectMaterials() : selectMaterialsByIds(ids)),
    [idsKey, ids],
  );

  const resolved = useAppSelector(selector);

  // Which of the requested ids the mirror is missing. Recomputed only when
  // the id list or the projection changes — the projection changes when a
  // requested row arrives, which is exactly when this answer moves.
  const missingKey = useMemo(() => {
    if (!ids.length || idsKey === undefined) return "";
    const missing = ids.filter((id) => !(resolved as never as object)?.[id as never]);
    return missing.join("\u0000");
  }, [ids, idsKey, resolved]);

  useEffect(() => {
    if (!missingKey) return;
    dispatch(ensureMaterialsLoaded({ ids: missingKey.split("\u0000") }));
  }, [dispatch, missingKey]);

  return resolved;
}
