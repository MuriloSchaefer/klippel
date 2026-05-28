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
import { closeSync, mkdirSync, openSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webappRoot = resolve(__dirname, '..', '..');

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

for (let i = 1; i <= reps; i++) {
  const logPath = join(outDir, `${stamp}_${script.replace(/[^\w.-]/g, '_')}_run-${i}.log`);
  const fd = openSync(logPath, 'w');
  console.log(`=== run ${i}/${reps} -> ${logPath}`);
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
}

const failed = results.filter((r) => r.status !== 0 || r.signal);
console.log(`\n=== ${reps} run(s) complete: ${reps - failed.length} ok, ${failed.length} failed`);
for (const f of failed) {
  console.log(`    FAILED run ${f.run}: ${f.signal ? `signal ${f.signal}` : `exit ${f.status}`} -> ${f.logPath}`);
}
process.exit(failed.length ? 1 : 0);
