#!/usr/bin/env node
/**
 * Orphan / RSS monitor for the e2e headless leak investigation
 * (src/docs/analysis/e2e-headless-memory-leak.md §3.1 — the decisive instrument).
 *
 * Read-only. Samples the process table on an interval and logs how many
 * harness processes (Xvfb, Electron, vite/esbuild, jazz-run) have been
 * re-parented to init (orphans), their summed RSS, thread count, and the
 * number of leaked Xvfb display locks. Run it in a second terminal (or
 * backgrounded) for the duration of a repeat-tests run:
 *
 *   node scripts/devtools/monitor-orphans.mjs --interval 5 &
 *   ENV_NAME=benchmark BASE_WORKSPACE=empty \
 *     node scripts/devtools/repeat-tests.mjs test:e2e:headless 15
 *   kill %1   # stop the monitor (or Ctrl-C)
 *
 * Output streams to stdout and appends to a timestamped log under
 * .tests-executions/. A clean run keeps orphans≈0; the leak shows as a
 * monotonically rising orphan count / RSS that never falls between iterations.
 *
 * Flags:
 *   --interval <sec>   sampling period (default 5)
 *   --duration <sec>   stop after N seconds (default: run until Ctrl-C)
 *   --parent <pid>     "orphan" parent pid (default 1 / init)
 *   --out <file>       log path (default .tests-executions/orphan-census-<stamp>.log)
 *   --verbose          also print one line per orphan process each tick
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshot, formatLine } from './lib/processCensus.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webappRoot = resolve(__dirname, '..', '..');

const argv = process.argv.slice(2);
const getOpt = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : def;
};
const intervalMs = Number(getOpt('--interval', '5')) * 1000;
const durationSec = getOpt('--duration', undefined);
const parentPid = Number(getOpt('--parent', '1'));
const verbose = argv.includes('--verbose');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = resolve(
  getOpt('--out', join(webappRoot, '.tests-executions', `orphan-census-${stamp}.log`)),
);
mkdirSync(dirname(outFile), { recursive: true });

const emit = (line) => {
  process.stdout.write(line + '\n');
  try {
    appendFileSync(outFile, line + '\n');
  } catch {
    /* keep sampling even if the log write fails */
  }
};

emit(`# orphan monitor — interval=${intervalMs / 1000}s parent=${parentPid} -> ${outFile}`);

let peakProcs = 0;
let peakRss = 0;
let ticks = 0;

const tick = () => {
  ticks += 1;
  const s = snapshot({ repoPath: webappRoot, parentPid });
  peakProcs = Math.max(peakProcs, s.procCount);
  peakRss = Math.max(peakRss, s.procRssGiB);
  emit(formatLine(s));
  if (verbose) {
    for (const r of s.rows) {
      emit(`    pid=${r.pid} ppid=${r.ppid} rss=${(r.rssKb / 1024).toFixed(0)}MiB thr=${r.threads} ${r.comm}`);
    }
  }
};

const finish = () => {
  clearInterval(timer);
  emit(`# stopped after ${ticks} sample(s) — peak procs=${peakProcs} peak procRss=${peakRss}GiB`);
  process.exit(0);
};

tick(); // immediate first sample
const timer = setInterval(tick, intervalMs);
process.on('SIGINT', finish);
process.on('SIGTERM', finish);
if (durationSec !== undefined) setTimeout(finish, Number(durationSec) * 1000);
