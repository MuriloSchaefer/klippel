/**
 * Who still needs a material resident in the mirror.
 *
 * The mirror is a window of the catalog, and something has to decide when a
 * row it holds can go. This slice is that record: how many mounted consumers
 * are rendering each id, when each id was last read, and the two knobs that
 * turn those facts into evictions.
 *
 * A material stays when
 *
 *   - a mounted consumer is rendering it (`refCounts`), or
 *   - a tab still references it (a pin — `window.pins`, not here), or
 *   - it was read within the TTL — the grace that makes a tab switch, or a
 *     scroll back up, hit a resident row instead of a refetch.
 *
 * Nothing renders from this state; it exists so the sweep can be computed
 * from the store like everything else, and so other modules can take part
 * through actions and hooks rather than by importing a registry object.
 * Because reads happen per row per render, the hooks that write it coalesce
 * their dispatches — see `hooks/useMaterialResidency`.
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

export interface ResidencyState {
  /** Mounted consumers per id. Absent (or 0) means nobody is rendering it. */
  refCounts: { [id: string]: number };
  /** Last time each id was read, by anyone (epoch ms). */
  lastAccess: { [id: string]: number };
  config: ResidencyConfig;
}

export const DEFAULT_RESIDENCY_CONFIG: ResidencyConfig = {
  ttlMs: 5 * 60_000,
  sweepIntervalMs: 60_000,
};

/**
 * Floor for both knobs. A zero TTL would evict rows the user is about to
 * scroll back to; a zero interval would busy-sweep.
 */
export const MIN_RESIDENCY_MS = 1_000;

export const initialState: ResidencyState = {
  refCounts: {},
  lastAccess: {},
  config: DEFAULT_RESIDENCY_CONFIG,
};
