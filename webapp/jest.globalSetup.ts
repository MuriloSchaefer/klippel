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

type CdpTarget = { type?: string; url?: string };

// Ask the browser-level CDP for its targets via websocket. /json/list hides
// page targets that already have an attached client (e.g. an external
// DevTools/VS Code debugger session), but Target.getTargets returns them
// regardless of attachment state.
const probeCdpViaWs = (wsUrl: string): Promise<boolean> =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* ignore */ }
      resolve(ok);
    };
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => finish(false), 1500);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Target.getTargets' }));
    };
    ws.onerror = () => { clearTimeout(timer); finish(false); };
    ws.onmessage = (ev: MessageEvent) => {
      clearTimeout(timer);
      try {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
        const infos: CdpTarget[] = msg?.result?.targetInfos ?? [];
        const ok = infos.some(
          (t) => t.type === 'page' && t.url && t.url !== 'about:blank',
        );
        finish(ok);
      } catch {
        finish(false);
      }
    };
  });

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
  if (list && list.status === 200) {
    try {
      const targets = JSON.parse(list.body) as CdpTarget[];
      if (targets.some((t) => t.type === 'page' && t.url && t.url !== 'about:blank')) {
        return true;
      }
    } catch {
      // fall through to websocket probe
    }
  }
  // /json/list omits targets that already have an attached client. Ask the
  // browser-level CDP directly so an attached external debugger doesn't make
  // the probe time out.
  try {
    const meta = JSON.parse(version.body) as { webSocketDebuggerUrl?: string };
    if (meta.webSocketDebuggerUrl) {
      return await probeCdpViaWs(meta.webSocketDebuggerUrl);
    }
  } catch {
    /* ignore */
  }
  return false;
};

export default async function globalSetup() {
  if (!process.env.ENV_NAME) {
    throw new Error('ENV_NAME is required (e.g. ENV_NAME=small-app npx jest)');
  }
  if (!process.env.BASE_WORKSPACE) {
    throw new Error('BASE_WORKSPACE is required (e.g. BASE_WORKSPACE=empty npx jest)');
  }

  if (await probeCdp()) {
    // eslint-disable-next-line no-console
    console.log(`[globalSetup] reusing existing Klippel on CDP :${CDP_PORT} (skipped boot)`);
    (globalThis as any).__KLIPPEL_OWNED_PROCESS__ = false;
    return;
  }

  const installedBin = process.env.KLIPPEL_BIN_PATH;
  const useXvfb = process.env.KLIPPEL_USE_XVFB === '1';

  let cmd: string;
  let args: string[];

  // xvfb-run defaults to an 8-bit screen, which Electron's GPU/compositor
  // can't initialize — Renderer targets get torn down mid-test ("Target
  // closed"). Force 24-bit at a reasonable resolution.
  const xvfbPrefix = ['-a', '--server-args=-screen 0 1280x1024x24'];

  if (installedBin) {
    // Drive the installed Klippel binary directly. Used by the bundled test
    // runner that ships alongside releases — it spawns its own Electron
    // instance from the installed app and exposes CDP for puppeteer.
    const baseArgs = [`--remote-debugging-port=${CDP_PORT}`];
    if (process.platform === 'linux') baseArgs.push('--no-sandbox');
    if (useXvfb) {
      cmd = 'xvfb-run';
      args = [...xvfbPrefix, installedBin, ...baseArgs];
    } else {
      cmd = installedBin;
      args = baseArgs;
    }
  } else {
    // Dev mode: launch the local repo via `npm run dev`.
    cmd = useXvfb ? 'xvfb-run' : 'npm';
    args = useXvfb ? [...xvfbPrefix, 'npm', 'run', 'dev'] : ['run', 'dev'];
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

  // VS Code's Jest extension runs the test host with ELECTRON_RUN_AS_NODE=1
  // (it's set for the extension host and inherited by spawned tasks). If that
  // leaks into the Electron binary we spawn here, `require('electron')` in the
  // main process returns the binary path instead of the API and the app
  // crashes on boot at `@electron-toolkit/utils` reading `app.isPackaged`,
  // which surfaces as a CDP-timeout in this setup. Strip it.
  const childEnv = { ...process.env };
  delete childEnv.ELECTRON_RUN_AS_NODE;

  // xvfb-run only sets DISPLAY (X11). On Wayland sessions, Electron picks up
  // WAYLAND_DISPLAY from the inherited env and renders to the real compositor
  // instead of Xvfb — the window appears even in "headless" mode. Strip the
  // Wayland hints so Electron falls back to the Xvfb X server.
  if (useXvfb) {
    delete childEnv.WAYLAND_DISPLAY;
    delete childEnv.XDG_SESSION_TYPE;
  }

  const child = spawn(cmd, args, {
    cwd: process.cwd(),
    stdio,
    detached: true,
    env: childEnv,
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
