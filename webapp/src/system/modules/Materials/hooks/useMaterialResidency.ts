import { useCallback, useEffect, useMemo, useRef } from "react";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import {
  configureMaterialsResidency,
  releaseMaterials,
  retainMaterials,
  sweepMaterialsResidency,
  touchMaterials,
} from "../store/residency/actions";
import type { ResidencyConfig } from "../store/residency/state";

/**
 * How long the scroll has to be still before residency is written.
 *
 * A **trailing** debounce, not a throttle: the timer restarts on every report,
 * so a continuous scroll dispatches nothing and the store is written once, on
 * the pause. The stock grid reports its visible range on every scroll frame,
 * and each report would otherwise be a dispatch — a notification to every
 * subscriber in the app — while the user is scrolling through the very rows
 * that have to keep painting.
 *
 * Safe because residency is a decision about what may be reclaimed *later*:
 * the sweep runs at most once a minute, rows are touched as they arrive, and
 * whatever is on screen when the scroll stops is retained before any of that
 * matters. During the scroll the previous range stays retained, so what the
 * user just scrolled away from is not unprotected either.
 */
const SCROLL_SETTLE_MS = 250;

export interface MaterialResidencyManager {
  functions: {
    /** Claim residency for these ids until the matching `release`. */
    retain(ids: string[]): void;
    /** Give up a claim made with `retain`. */
    release(ids: string[]): void;
    /** Record a read without claiming residency. */
    touch(ids: string[]): void;
    /** Reclaim everything nothing needs, now. */
    sweep(): void;
    /** Retune the TTL / sweep cadence. */
    configure(patch: Partial<ResidencyConfig>): void;
  };
}

/**
 * Imperative access to the mirror's residency rules.
 *
 * This is the surface other modules use; nothing outside this module should
 * import the slice's actions directly. Every function is referentially stable
 * for the life of the component, so it is safe in dependency arrays.
 */
export default function useMaterialResidency(): MaterialResidencyManager {
  const storeModule = useModule<Store>("Store");
  const dispatch = storeModule.hooks.useAppDispatch();

  return useMemo(
    () => ({
      functions: {
        retain: (ids: string[]) => {
          if (ids.length) dispatch(retainMaterials(ids));
        },
        release: (ids: string[]) => {
          if (ids.length) dispatch(releaseMaterials(ids));
        },
        touch: (ids: string[]) => {
          if (ids.length) dispatch(touchMaterials(ids));
        },
        sweep: () => dispatch(sweepMaterialsResidency()),
        configure: (patch: Partial<ResidencyConfig>) =>
          dispatch(configureMaterialsResidency(patch)),
      },
    }),
    [dispatch],
  );
}

/** NUL: ids come verbatim from the imported spreadsheet and may contain spaces. */
const SEP = "\u0000";

/**
 * Keep these materials resident for as long as the component is mounted.
 *
 * The declarative form of `retain` / `release`, which must always be paired —
 * doing both in one effect is what guarantees that. Pass the ids the
 * component is actually rendering; an empty list is free.
 *
 * Ids are compared by value (NUL-joined, because ids come verbatim from the
 * imported spreadsheet and may contain spaces), so a caller passing a fresh
 * array literal each render does not thrash the store.
 */
export function useRetainedMaterials(ids: readonly string[]): void {
  const { functions } = useMaterialResidency();
  const key = ids.join(SEP);

  useEffect(() => {
    if (!key) return;
    const list = key.split(SEP);
    functions.retain(list);
    return () => functions.release(list);
    // `functions` is stable; `key` is the value identity of the id list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/**
 * Retain a set that changes often — the stock grid's visible range.
 *
 * Returns a stable `report(ids)`. Reports are debounced until the scroll
 * settles (see `SCROLL_SETTLE_MS`) and then diffed, so a fling produces one
 * retain/release pair at the end and a range that has not actually changed
 * produces none. The previous set is released as the new one is retained, and
 * whatever is held at unmount is released then.
 */
export function useVisibleMaterials(): (ids: string[]) => void {
  const { functions } = useMaterialResidency();

  const heldRef = useRef<string[]>([]);
  const pendingRef = useRef<string[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timerRef.current = null;
    const next = pendingRef.current;
    pendingRef.current = null;
    if (!next) return;
    const previous = heldRef.current;
    if (next.length === previous.length && next.every((id, i) => id === previous[i])) {
      return;
    }
    // Retain before releasing: the two sets overlap heavily while scrolling,
    // and dropping to zero in between would open a window in which the sweep
    // could reclaim a row that is on screen throughout.
    functions.retain(next);
    functions.release(previous);
    heldRef.current = next;
  }, [functions]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Unmounting is letting go of everything this instance was showing.
      functions.release(heldRef.current);
      heldRef.current = [];
    },
    [functions],
  );

  return useCallback(
    (ids: string[]) => {
      pendingRef.current = ids;
      // Restart, don't extend: the write lands when the scrolling stops, not
      // every SCROLL_SETTLE_MS while it continues.
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SCROLL_SETTLE_MS);
    },
    [flush],
  );
}
