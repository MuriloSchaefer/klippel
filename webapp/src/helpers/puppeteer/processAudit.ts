/* istanbul ignore file */
/**
 * Teardown audit — instrumentation for the e2e headless leak investigation
 * (src/docs/analysis/e2e-headless-memory-leak.md §3.3).
 *
 * Pure measurement, gated by `KLIPPEL_TEARDOWN_AUDIT=1`. The idea: capture the
 * full process tree under a spawned root (e.g. a peer's `xvfb-run` wrapper)
 * *before* teardown runs, then check which of those exact PIDs are still alive
 * *after* — those are processes the kill path failed to reap.
 *
 * Capturing PIDs up-front is what makes this robust to re-parenting: when the
 * `xvfb-run` wrapper dies, its Xvfb / Electron children get a new parent but
 * keep their PID, so `/proc/<pid>` still resolves and the survivor shows up.
 *
 * Linux-only (reads `/proc`); the headless harness already requires Linux+Xvfb.
 * Never throws into the caller — instrumentation must not break teardown.
 */
import { commOf, descendantsOf, ppidOf, procAlive } from "./processTree";

export const auditEnabled = (): boolean =>
  process.env.KLIPPEL_TEARDOWN_AUDIT === "1";

/**
 * Snapshot the process trees rooted at each given PID (root + descendants).
 * Call before teardown; pass the result to {@link logSurvivors} after.
 * Returns `[]` when the audit is disabled so callers can guard cheaply.
 */
export const captureTree = (roots: Array<number | undefined>): number[] => {
  if (!auditEnabled()) return [];
  const pids = new Set<number>();
  for (const root of roots) {
    if (typeof root !== "number") continue;
    pids.add(root);
    for (const d of descendantsOf(root)) pids.add(d);
  }
  return [...pids];
};

/**
 * Log which of the previously-captured PIDs are still alive after teardown.
 * No-op (cheap) when the audit is disabled or nothing was captured.
 */
export const logSurvivors = (label: string, watched: number[]): void => {
  if (!auditEnabled() || watched.length === 0) return;
  try {
    const survivors = watched.filter(procAlive);
    if (survivors.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[teardown-audit] ${label}: clean — 0 survivors of ${watched.length} watched pid(s)`,
      );
      return;
    }
    // eslint-disable-next-line no-console
    console.warn(
      `[teardown-audit] ${label}: ${survivors.length} SURVIVOR(s) of ${watched.length} watched pid(s):`,
    );
    for (const pid of survivors) {
      // eslint-disable-next-line no-console
      console.warn(`  pid=${pid} ppid=${ppidOf(pid)} comm=${commOf(pid)}`);
    }
  } catch {
    /* instrumentation must never break teardown */
  }
};
