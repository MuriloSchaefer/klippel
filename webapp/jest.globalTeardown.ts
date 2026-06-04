import { setTimeout as sleep } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';
import { execFileSync } from 'node:child_process';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);

const cdpUp = (): Promise<boolean> =>
  new Promise((resolve) => {
    const req = httpRequest(
      `http://localhost:${CDP_PORT}/json/version`,
      { method: 'GET', timeout: 500 },
      (res: any) => {
        res.resume();
        resolve((res.statusCode ?? 0) === 200);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });

const closeViaCdp = async (): Promise<void> => {
  try {
    const { default: puppeteer } = await import('puppeteer-core');
    const browser = await puppeteer.connect({
      browserURL: `http://localhost:${CDP_PORT}`,
      defaultViewport: null,
    });
    await browser.close();
  } catch {
    /* best-effort */
  }
};

const killGroup = (pid: number, signal: NodeJS.Signals): boolean => {
  try {
    process.kill(-pid, signal);
    return true;
  } catch {
    try {
      process.kill(pid, signal);
      return true;
    } catch {
      return false;
    }
  }
};

// Last-resort fallback: whatever is still bound to the CDP port gets killed by
// PID. The dev-mode process tree (npm → electron-vite → electron + its GPU and
// renderer subprocesses, optionally under xvfb-run) can outlive a process-group
// SIGKILL when a child re-parents or escapes the group — leaving the app alive
// on :9222, which the next run's globalSetup then silently reuses in a dirty
// state. Clearing the port by listener PID closes that gap.
const killWhateverHoldsPort = (): void => {
  let pids: number[] = [];
  try {
    const out = execFileSync('lsof', ['-ti', `tcp:${CDP_PORT}`], {
      encoding: 'utf8',
    });
    pids = out
      .split('\n')
      .map((l) => Number(l.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    // lsof exits non-zero when nothing holds the port, or may be absent.
    return;
  }
  for (const pid of pids) {
    try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ }
  }
};

export default async function globalTeardown() {
  if (!(globalThis as any).__KLIPPEL_OWNED_PROCESS__) return;
  const pid = (globalThis as any).__KLIPPEL_DEV_PID__ as number | undefined;

  // Instrumentation (KLIPPEL_TEARDOWN_AUDIT=1): capture the shared-app process
  // tree BEFORE the kill sequence, so we can report any survivors afterward.
  // Dynamic import + try/catch so this can never break teardown.
  const audit = process.env.KLIPPEL_TEARDOWN_AUDIT === '1';
  let auditWatched: number[] = [];
  if (audit && pid) {
    try {
      const { captureTree } = await import('./src/helpers/puppeteer/processAudit');
      auditWatched = captureTree([pid]);
    } catch { /* audit module unavailable — skip */ }
  }

  // Graceful path: ask Electron to quit via CDP. This unwinds the renderer,
  // main process, and GPU subprocess in order; without it `npm run dev`
  // (npm → electron-vite → electron) tends to leak the windowed app even
  // after SIGTERM on the process group.
  await Promise.race([closeViaCdp(), sleep(5000)]);

  // Even after Browser.close, the dev wrapper (npm + electron-vite watcher)
  // keeps running — tear down the whole group.
  if (pid) {
    killGroup(pid, 'SIGTERM');

    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (!(await cdpUp())) break;
      await sleep(250);
    }

    killGroup(pid, 'SIGKILL');
  }

  // Verify the port is actually free; if the group-kill missed something,
  // force-clear it by listener PID so the next run boots a clean instance.
  const verifyDeadline = Date.now() + 5000;
  while (Date.now() < verifyDeadline) {
    if (!(await cdpUp())) return;
    killWhateverHoldsPort();
    await sleep(250);
  }

  if (await cdpUp()) {
    // eslint-disable-next-line no-console
    console.warn(
      `[globalTeardown] Klippel still reachable on CDP :${CDP_PORT} after teardown — next run may reuse a dirty instance.`,
    );
  }

  if (audit && auditWatched.length) {
    try {
      const { logSurvivors } = await import('./src/helpers/puppeteer/processAudit');
      logSurvivors('globalTeardown(shared-app)', auditWatched);
    } catch { /* ignore */ }
  }
}
