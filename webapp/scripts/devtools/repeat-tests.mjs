#!/usr/bin/env node
/**
 * Run an npm script repeatedly and capture each run's output to a log file.
 *
 * Usage:
 *   node scripts/devtools/repeat-tests.mjs <npm-script> <repetitions> [-- ...extra jest args]
 *
 * Example:
 *   ENV_NAME=benchmark BASE_WORKSPACE=empty \
 *     node scripts/devtools/repeat-tests.mjs test:e2e:headless 15
 *
 * Logs land in webapp/.tests-executions/ (gitignored), one file per run.
 *
 * Why a custom runner instead of `for i in ...; do npm run ... | tee; done`:
 * a pipe makes the shell wait for `tee`, which waits for EOF on stdout — an
 * orphaned Electron child that inherited the stdout fd keeps the pipe open and
 * stalls the loop forever. We redirect each run straight to a file fd (no pipe
 * reader to wait on) and append --forceExit so jest tears down its handles.
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, closeSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshot, formatLine } from './lib/processCensus.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webappRoot = resolve(__dirname, '..', '..');

// Instrumentation (KLIPPEL_INSTRUMENT=1): bracket each iteration with a
// process census so the leak curve is tied to iteration number. Off by
// default — pure measurement, never changes how the runs are spawned.
// See src/docs/analysis/e2e-headless-memory-leak.md §3.2.
const INSTRUMENT = process.env.KLIPPEL_INSTRUMENT === '1';

// Safety nets for the headless-run leak (§4-D). The teardown fix should keep
// these idle, but they keep a repeat run from taking the whole machine down:
//   - memory guard (default on): abort before a run if too little RAM is free.
//   - inter-run reaping (KLIPPEL_REAP=1): kill leftover project Xvfb/Electron
//     and stale X-locks between runs. Opt-in, because it would also kill a
//     klippel dev app you happen to have open.
const MIN_FREE_GIB = Number(process.env.KLIPPEL_MIN_FREE_GIB ?? '2');
const REAP = process.env.KLIPPEL_REAP === '1';

const memAvailableGiB = () => {
  try {
    const m = readFileSync('/proc/meminfo', 'utf8').match(/MemAvailable:\s+(\d+)\s*kB/);
    return m ? +(Number(m[1]) / 1024 / 1024).toFixed(2) : Infinity;
  } catch {
    return Infinity; // non-Linux / unreadable — don't block
  }
};

const pidAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
};

// Kill leftover project processes + remove stale Xvfb display locks. Returns
// counts for logging. Project-scoped so it can't touch the editor's Electron.
const reapLeftovers = () => {
  let killed = 0;
  for (const r of snapshot({ repoPath: webappRoot }).rows) {
    try { process.kill(r.pid, 'SIGKILL'); killed += 1; } catch { /* gone */ }
  }
  let locks = 0;
  try {
    for (const f of readdirSync('/tmp')) {
      if (!/^\.X\d+-lock$/.test(f)) continue;
      const p = join('/tmp', f);
      try {
        const owner = Number((readFileSync(p, 'utf8').match(/\d+/) ?? [])[0]);
        if (owner && !pidAlive(owner)) { rmSync(p, { force: true }); locks += 1; }
      } catch { /* skip */ }
    }
  } catch { /* /tmp unreadable */ }
  return { killed, locks };
};

const [script, repsArg, ...rest] = process.argv.slice(2);
const extraArgs = rest[0] === '--' ? rest.slice(1) : rest;

if (!script || !repsArg) {
  console.error(
    'usage: node scripts/devtools/repeat-tests.mjs <npm-script> <repetitions> [-- ...extra jest args]',
  );
  process.exit(2);
}

const reps = Number(repsArg);
if (!Number.isInteger(reps) || reps < 1) {
  console.error(`repetitions must be a positive integer, got: ${repsArg}`);
  process.exit(2);
}

const outDir = join(webappRoot, '.tests-executions');
mkdirSync(outDir, { recursive: true });

// Append --forceExit so jest exits promptly instead of hanging on leaked
// async handles, unless the caller already passed it.
const jestArgs = extraArgs.includes('--forceExit') ? extraArgs : [...extraArgs, '--forceExit'];
const npmArgs = ['run', script, '--', ...jestArgs];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const results = [];

const censusPath = join(outDir, `${stamp}_${script.replace(/[^\w.-]/g, '_')}_census.log`);
const census = () => snapshot({ repoPath: webappRoot });
const recordCensus = (label, s) => {
  const line = `${label}: ${formatLine(s)}`;
  console.log(`    ${line}`);
  try { appendFileSync(censusPath, line + '\n'); } catch { /* keep going */ }
};
if (INSTRUMENT) {
  console.log(`=== instrumentation on -> ${censusPath}`);
  recordCensus('baseline', census());
}

for (let i = 1; i <= reps; i++) {
  // Memory guard: bail before a run if too little RAM is free, rather than
  // driving the machine into a swap-death freeze mid-suite.
  const avail = memAvailableGiB();
  if (avail < MIN_FREE_GIB) {
    console.error(
      `ABORTING before run ${i}: only ${avail}GiB available ` +
        `(< KLIPPEL_MIN_FREE_GIB=${MIN_FREE_GIB}). Leftover processes may be leaking — ` +
        `clean them up (or set a lower threshold) before continuing.`,
    );
    process.exit(3);
  }

  const logPath = join(outDir, `${stamp}_${script.replace(/[^\w.-]/g, '_')}_run-${i}.log`);
  const fd = openSync(logPath, 'w');
  console.log(`=== run ${i}/${reps} -> ${logPath} (mem avail ${avail}GiB)`);
  const before = INSTRUMENT ? census() : null;
  const started = Date.now();
  try {
    const { status, signal } = spawnSync('npm', npmArgs, {
      cwd: webappRoot,
      // stdout/stderr go straight to the file fd: no pipe, so an orphaned
      // child holding the fd can't block us from advancing to the next run.
      stdio: ['ignore', fd, fd],
    });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const code = signal ? `signal ${signal}` : `exit ${status}`;
    console.log(`    run ${i} finished in ${seconds}s (${code})`);
    results.push({ run: i, status, signal, seconds, logPath });
  } finally {
    closeSync(fd);
  }
  if (INSTRUMENT) {
    const after = census();
    recordCensus(`run ${i} before`, before);
    recordCensus(`run ${i} after `, after);
    console.log(
      `    run ${i} delta: procs ${before.procCount}→${after.procCount} ` +
        `(${after.procCount - before.procCount >= 0 ? '+' : ''}${after.procCount - before.procCount}), ` +
        `rss ${before.procRssGiB}→${after.procRssGiB}GiB, xlocks ${before.xlocks}→${after.xlocks}`,
    );
  }

  // Inter-run reaping (opt-in): mop up anything teardown missed so leaks can't
  // accumulate across iterations. Runs after the census so the per-run delta
  // still reflects what teardown actually left behind.
  if (REAP) {
    const { killed, locks } = reapLeftovers();
    console.log(`    run ${i} reaped ${killed} leftover proc(s), ${locks} stale lock(s)`);
  }
}

const failed = results.filter((r) => r.status !== 0 || r.signal);
console.log(`\n=== ${reps} run(s) complete: ${reps - failed.length} ok, ${failed.length} failed`);
for (const f of failed) {
  console.log(`    FAILED run ${f.run}: ${f.signal ? `signal ${f.signal}` : `exit ${f.status}`} -> ${f.logPath}`);
}
process.exit(failed.length ? 1 : 0);
