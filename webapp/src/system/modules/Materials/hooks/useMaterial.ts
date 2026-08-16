import { useEffect } from "react";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { ensureMaterialsLoaded } from "../store/materials/actions";
import { selectMaterial } from "../store/materials/selectors";
import { useRetainedMaterials } from "./useMaterialResidency";
import type { MaterialState } from "../store/materials/state";

/** Stable empty list, so an absent id does not allocate a new array per render. */
const EMPTY_IDS: string[] = [];

/**
 * One material, by id — an O(1) read that re-renders the caller only when
 * *that* material changes.
 *
 * This is the default for row-level UI. Subscribing to the whole map instead
 * (`useMaterials()`) re-renders every consumer on every catalog tick, which is
 * what made a single peer edit re-render the entire Composer tree
 * (docs/analysis/materials-catalog-lag-analysis.md, F3).
 *
 * **Resolves what it does not find.** The mirror holds a window of the
 * catalog and now gives rows back when nothing needs them, so "absent" is an
 * ordinary state rather than an error: the hook asks for the row and re-renders
 * when it lands. Callers still have to handle `undefined` for the frame before
 * that — and permanently, for an id no catalog row answers to (a reference to
 * a material a peer deleted).
 *
 * **Claims residency while mounted.** A material something is rendering is
 * never swept, however long ago it was loaded; the TTL only starts once the
 * last reader unmounts.
 */
export default function useMaterial(
  id: string | undefined,
): MaterialState | undefined {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector, useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();

  // Hooks can't be called conditionally, so an absent id reads through the
  // empty-string key, which no material can hold.
  const material = useAppSelector(selectMaterial(id ?? ""));

  // Claims residency while mounted — the sweep never reclaims a row
  // something is rendering, however long ago it was loaded.
  useRetainedMaterials(id ? [id] : EMPTY_IDS);

  // Depend on *whether* it is missing, not on the row itself: keying the
  // effect on the object would re-run it on every edit of a material that is
  // already here.
  const missing = Boolean(id) && material === undefined;
  useEffect(() => {
    if (!id || !missing) return;
    // The middleware de-duplicates concurrent and already-answered requests,
    // so a grid of rows all missing the same material still costs one read.
    dispatch(ensureMaterialsLoaded({ ids: [id] }));
  }, [dispatch, id, missing]);

  return material;
}
