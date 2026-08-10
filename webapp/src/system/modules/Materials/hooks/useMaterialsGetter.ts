import { useCallback } from "react";
import { useStore } from "react-redux";

import { selectMaterials } from "../store/materials/selectors";
import type { MaterialsState } from "../store/materials/state";

/**
 * Read the catalog **without subscribing to it**.
 *
 * For code that only needs a material at the moment an action fires — an
 * action closure, an event handler, an imperative lookup — the reactive
 * subscription is pure cost: the value is read once, when the user does
 * something, but the component re-renders on every catalog tick until then
 * (docs/analysis/materials-catalog-lag-analysis.md, F3).
 *
 * It is also *more* correct for those call sites. A subscription hands the
 * closure whatever the catalog held at its last render; this reads the store
 * at call time, so an action never acts on a stale snapshot.
 *
 * Use `useMaterial` / `useMaterials(ids)` when the render output depends on
 * the data — this getter does not trigger re-renders and must not be read
 * during render.
 */
export default function useMaterialsGetter(): () => MaterialsState {
  const store = useStore();
  return useCallback(
    () => (selectMaterials()(store.getState() as never) ?? {}) as MaterialsState,
    [store],
  );
}
