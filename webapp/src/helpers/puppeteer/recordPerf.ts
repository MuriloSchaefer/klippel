/* istanbul ignore file */
/**
 * Budget recording for performance tests. Every perf `it` appends one
 * machine-readable record per measured outcome so numbers are *trended*,
 * not just pass/failed (see e2e-tests.md §11.1). Records land in
 * `webapp/.tests-executions/perf-results.jsonl` (one JSON object per
 * line — append-only, git-ignored alongside the run logs).
 *
 * `expectWithinBudget` records *and* asserts in one call so a test can't
 * forget to persist the number it just checked.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { hostname, arch, platform, cpus } from "node:os";
import { dirname, join } from "node:path";

const RESULTS_FILE = join(
  process.cwd(),
  ".tests-executions",
  "perf-results.jsonl",
);

export type PerfRecord = {
  /** Surface under test, e.g. "cold-open", "list", "search", "convergence". */
  surface: string;
  /** Cardinality tier — count of whatever `unit` names. */
  cardinality: number;
  /** What `cardinality` counts. Defaults to "materials" for existing suites. */
  unit?: string;
  /** Peer count (1 for standalone). */
  peers: number;
  /** What was measured, e.g. "ms". */
  metric: string;
  /** Measured value. */
  value: number;
  /** Optional aggregates when the test runs multiple samples. */
  p50?: number;
  p95?: number;
};

const hardware = () => ({
  host: hostname(),
  platform: platform(),
  arch: arch(),
  cpus: cpus().length,
  cpuModel: cpus()[0]?.model ?? "unknown",
});

/** Append one perf record to the results file. */
export const recordPerf = (record: PerfRecord): void => {
  mkdirSync(dirname(RESULTS_FILE), { recursive: true });
  const line = JSON.stringify({
    ...record,
    hardware: hardware(),
    ts: new Date().toISOString(),
  });
  appendFileSync(RESULTS_FILE, line + "\n");
};

/**
 * Record the value, then assert it is within `budget`. Budgets are
 * placeholders until calibrated on reference hardware — the recorded
 * trend is what tells you the real number (§11.1).
 *
 * Always prints a one-line result so the measured number is visible in
 * the test output, not just buried in the jsonl artifact.
 */
export const expectWithinBudget = (
  record: PerfRecord,
  budget: number,
): void => {
  recordPerf(record);
  const within = record.value <= budget;
  const value = Math.round(record.value);
  // eslint-disable-next-line no-console
  const unit = record.unit ?? "materials";
  console.log(
    `[perf] ${record.surface} @ ${record.cardinality} ${unit} / ` +
      `${record.peers} peer(s): ${value}${record.metric} ` +
      `(budget ${budget}${record.metric}) — ${within ? "OK" : "OVER"}`,
  );
  if (!within) {
    throw new Error(
      `Perf budget exceeded for ${record.surface} @ ${record.cardinality} ` +
        `${unit} / ${record.peers} peer(s): ${value}${record.metric} ` +
        `> ${budget}${record.metric}`,
    );
  }
};

/** Time an async operation in wall-clock ms (node side). */
export const measure = async <T>(
  fn: () => Promise<T>,
): Promise<{ ms: number; result: T }> => {
  const t0 = performance.now();
  const result = await fn();
  return { ms: performance.now() - t0, result };
};
