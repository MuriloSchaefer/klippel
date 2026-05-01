import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';
import { openSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_VERSION_URL = `http://localhost:${CDP_PORT}/json/version`;
const CDP_LIST_URL = `http://localhost:${CDP_PORT}/json/list`;
const STARTUP_TIMEOUT_MS = Number(process.env.KLIPPEL_STARTUP_TIMEOUT_MS ?? 90_000);

const httpGet = (url: string): Promise<{ status: number; body: string } | null> =>
  new Promise((resolve) => {
    const req = httpRequest(url, { method: 'GET', timeout: 1000 }, (res: any) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });

// CDP is "ready" when /json/version is up AND at least one page target exists
// with a real renderer URL. The installed (packaged) app loads its renderer
// from `file://...`, so we accept any non-empty, non-about:blank URL.
const probeCdp = async (): Promise<boolean> => {
  const version = await httpGet(CDP_VERSION_URL);
  if (!version || version.status !== 200) return false;
  const list = await httpGet(CDP_LIST_URL);
  if (!list || list.status !== 200) return false;
  try {
    const targets = JSON.parse(list.body) as Array<{ type?: string; url?: string }>;
    return targets.some(
      (t) => t.type === 'page' && t.url && t.url !== 'about:blank',
    );
  } catch {
    return false;
  }
};

export default async function globalSetup() {
  if (await probeCdp()) {
    (globalThis as any).__KLIPPEL_OWNED_PROCESS__ = false;
    return;
  }

  const installedBin = process.env.KLIPPEL_BIN_PATH;
  const useXvfb = process.env.KLIPPEL_USE_XVFB === '1';

  let cmd: string;
  let args: string[];

  if (installedBin) {
    // Drive the installed Klippel binary directly. Used by the bundled test
    // runner that ships alongside releases — it spawns its own Electron
    // instance from the installed app and exposes CDP for puppeteer.
    const baseArgs = [`--remote-debugging-port=${CDP_PORT}`];
    if (process.platform === 'linux') baseArgs.push('--no-sandbox');
    if (useXvfb) {
      cmd = 'xvfb-run';
      args = ['-a', installedBin, ...baseArgs];
    } else {
      cmd = installedBin;
      args = baseArgs;
    }
  } else {
    // Dev mode: launch the local repo via `yarn dev`.
    cmd = useXvfb ? 'xvfb-run' : 'yarn';
    args = useXvfb ? ['-a', 'yarn', 'dev'] : ['dev'];
  }

  // When driving an installed binary (CI / on-device diagnostics) the silent
  // failure mode is brutal — capture stdio to a log file and surface it on
  // timeout. Local `yarn dev` keeps the original behavior unless KLIPPEL_DEV_LOG=1.
  const logPath = join(tmpdir(), `klippel-test-runner-${Date.now()}.log`);
  let stdio: any;
  if (process.env.KLIPPEL_DEV_LOG === '1') {
    stdio = 'inherit';
  } else if (installedBin) {
    const fd = openSync(logPath, 'a');
    stdio = ['ignore', fd, fd];
  } else {
    stdio = 'ignore';
  }

  const child = spawn(cmd, args, {
    cwd: process.cwd(),
    stdio,
    detached: true,
    env: { ...process.env },
  });
  child.unref();
  child.on('error', (err: any) => {
    // eslint-disable-next-line no-console
    console.error(`[globalSetup] spawn error: ${err?.message ?? err}`);
  });
  child.on('exit', (code: any, signal: any) => {
    if (code !== 0 && code !== null) {
      // eslint-disable-next-line no-console
      console.error(`[globalSetup] child exited early: code=${code} signal=${signal}`);
    }
  });

  (globalThis as any).__KLIPPEL_DEV_PID__ = child.pid;
  (globalThis as any).__KLIPPEL_OWNED_PROCESS__ = true;
  (globalThis as any).__KLIPPEL_LOG_PATH__ = installedBin ? logPath : undefined;

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await probeCdp()) return;
    await sleep(500);
  }

  let logTail = '';
  if (installedBin && existsSync(logPath)) {
    try {
      const buf = readFileSync(logPath, 'utf8');
      logTail = `\n--- last lines of ${logPath} ---\n${buf.split('\n').slice(-80).join('\n')}\n--- end ---`;
    } catch {
      logTail = `\n(could not read log at ${logPath})`;
    }
  }
  throw new Error(
    `Klippel did not expose CDP on :${CDP_PORT} within ${STARTUP_TIMEOUT_MS}ms${logTail}`,
  );
}
