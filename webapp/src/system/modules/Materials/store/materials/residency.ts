/**
 * Who still needs a material resident in Redux.
 *
 * The mirror is a window, but nothing ever shrank it: a page merges in, a
 * search replaces the *view* while its rows stay behind, a picker pulls a
 * whole type, a graph node resolves one row by id. Browse for a while in a
 * large catalog and the slice ends up holding it all — the thing windowing
 * exists to prevent.
 *
 * This registry answers the eviction question. A material stays when
 *
 *   - a mounted component is reading it (`retain` / `release`), or
 *   - a tab still references it (a pin, see the window slice), or
 *   - it is part of the current view (`resultIds`), or
 *   - it was read within the TTL — the grace that makes a tab switch, or a
 *     scroll back up, hit a resident row instead of a refetch.
 *
 * **Deliberately outside Redux.** Reads happen per row per render; recording
 * them through dispatches would put a store notification — and a re-render
 * pass over every subscriber — on the hot path of the very grid this work is
 * meant to keep smooth. Nothing here is rendered, so nothing here needs to be
 * state: the store only ever sees the eviction that eventually results.
 */

export interface ResidencyConfig {
  /**
   * How long an untouched, unreferenced material survives. The knob the
   * product ask calls the "delta time".
   */
  ttlMs: number;
  /** How often the sweep runs. Nothing is evicted between sweeps. */
  sweepIntervalMs: number;
}

export const DEFAULT_RESIDENCY_CONFIG: ResidencyConfig = {
  ttlMs: 5 * 60_000,
  sweepIntervalMs: 60_000,
};

let config: ResidencyConfig = { ...DEFAULT_RESIDENCY_CONFIG };

export const getResidencyConfig = (): ResidencyConfig => config;

/**
 * Override the TTL / sweep cadence. Values are clamped to something sane: a
 * zero TTL would evict rows the user is about to scroll back to, and a zero
 * interval would busy-sweep.
 */
export const setResidencyConfig = (
  patch: Partial<ResidencyConfig>,
): ResidencyConfig => {
  config = {
    ttlMs: Math.max(1_000, patch.ttlMs ?? config.ttlMs),
    sweepIntervalMs: Math.max(
      1_000,
      patch.sweepIntervalMs ?? config.sweepIntervalMs,
    ),
  };
  return config;
};

/** Mounted readers per material id. Zero (absent) means nobody is rendering it. */
const refCounts = new Map<string, number>();
/** Last time each id was read, by anyone. */
const lastAccess = new Map<string, number>();

const now = () => Date.now();

/** Record a read without claiming residency — the getter / imperative path. */
export function touchMaterials(ids: Iterable<string>): void {
  const t = now();
  for (const id of ids) {
    if (id) lastAccess.set(id, t);
  }
}

/**
 * Claim residency for as long as the caller is mounted. Every `retain` must
 * be paired with exactly one `release`, which is why the hooks do both in one
 * effect rather than spreading them across handlers.
 */
export function retainMaterials(ids: Iterable<string>): void {
  const t = now();
  for (const id of ids) {
    if (!id) continue;
    refCounts.set(id, (refCounts.get(id) ?? 0) + 1);
    lastAccess.set(id, t);
  }
}

export function releaseMaterials(ids: Iterable<string>): void {
  const t = now();
  for (const id of ids) {
    if (!id) continue;
    const next = (refCounts.get(id) ?? 0) - 1;
    if (next > 0) refCounts.set(id, next);
    else refCounts.delete(id);
    // The TTL starts at the moment the last reader let go, not at the last
    // render: leaving a tab should buy the row a full grace period.
    lastAccess.set(id, t);
  }
}

/** Is anything currently rendering this material? */
export const isRetained = (id: string): boolean => (refCounts.get(id) ?? 0) > 0;

/**
 * Which of `resident` may be dropped: nobody is rendering it, nothing
 * protects it, and its grace period has run out.
 *
 * Pure apart from reading the registry — the caller decides what to do with
 * the answer, which keeps this unit-testable without a store.
 */
export function collectEvictable(
  resident: Iterable<string>,
  protectedIds: ReadonlySet<string>,
  at: number = now(),
): string[] {
  const { ttlMs } = config;
  const out: string[] = [];
  for (const id of resident) {
    if (protectedIds.has(id)) continue;
    if (isRetained(id)) continue;
    const seen = lastAccess.get(id);
    // Never seen means never read by any UI — it arrived in a page and was
    // scrolled past. Treat it as due, or a mirror filled by scrolling would
    // never shrink.
    if (seen !== undefined && at - seen < ttlMs) continue;
    out.push(id);
  }
  return out;
}

/** Forget bookkeeping for ids that are no longer in the slice. */
export function forgetMaterials(ids: Iterable<string>): void {
  for (const id of ids) {
    refCounts.delete(id);
    lastAccess.delete(id);
  }
}

/**
 * The mirror was replaced (workspace switch, reset read): forget the access
 * history, which describes rows that are no longer there.
 *
 * Ref counts deliberately survive. They are not history — they count
 * components that are mounted *right now*, and those components did not
 * unmount just because the workspace did. Clearing them would strand a
 * mounted reader's rows unprotected until something re-triggered its effect;
 * a count for an id absent from the new catalog is simply inert.
 */
export function resetResidency(): void {
  lastAccess.clear();
}

/** Test/diagnostic view of the registry. */
export const residencyStats = () => ({
  retained: refCounts.size,
  tracked: lastAccess.size,
  config,
});
