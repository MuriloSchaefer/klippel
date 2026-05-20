/* istanbul ignore file */
/**
 * Spawn N Electron peers + a local cojson sync server for collaborative
 * e2e tests. Each peer runs against an isolated env dir under
 * `~/klippel/envs/<name>/`, its own Chromium profile, and a unique CDP
 * port; the sync server connects them via WebSocket.
 *
 * The harness assumes `dist/electron/main/index.js` is already built —
 * collaborative tests are not the place to also exercise the build
 * pipeline. Call `npm run prebuild` first (the `test:e2e:collaborative`
 * script runs it).
 *
 * No fixed timeouts in test bodies; the harness itself only uses a
 * bounded readiness poll for CDP / sync-server socket binding.
 */
import { spawn, type ChildProcess, type StdioOptions } from "node:child_process";
import { existsSync, openSync, readFileSync, rmSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { request as httpRequest } from "node:http";
import puppeteer, { type Browser, type Page } from "puppeteer-core";

export type Peer = {
  name: string;
  envName: string;
  cdpPort: number;
  userDataDir: string;
  envDir: string;
  logPath: string;
  process: ChildProcess;
  browser: Browser;
  page: Page;
};

export type CollaborativeHarness = {
  peers: Peer[];
  sync: { url: string; port: number; process: ChildProcess; logPath: string };
  teardown: () => Promise<void>;
};

type SpawnOpts = {
  /** Number of Electron peers to boot. */
  count: number;
  /** Stem used for env names + workspace dirs; suffixed `-a`, `-b`, … */
  namePrefix?: string;
  /** When true, streams child stdio to the host stdout. Default false. */
  debug?: boolean;
};

const REPO_WEBAPP = join(__dirname, "..", "..", "..");
const ELECTRON_BIN = join(REPO_WEBAPP, "node_modules", ".bin", "electron");
const JAZZ_RUN_BIN = join(REPO_WEBAPP, "node_modules", ".bin", "jazz-run");
const DIST_MAIN = join(REPO_WEBAPP, "dist", "electron", "main", "index.js");

function assertBuilt() {
  if (!existsSync(DIST_MAIN)) {
    throw new Error(
      `[collaborativeHarness] missing ${DIST_MAIN} — run \`npm run prebuild\` before collaborative tests.`,
    );
  }
}

/**
 * Reserve a free TCP port by opening a server on :0 and reading the
 * assigned port. Releases the listener before returning; the port is
 * usable in the brief window before the child binds.
 */
function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close();
        reject(new Error("could not reserve port"));
        return;
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
  });
}

async function pollUntil(
  probe: () => Promise<boolean>,
  deadlineMs: number,
  label: string,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start <= deadlineMs) {
    if (await probe()) return;
    await sleep(200);
  }
  throw new Error(`pollUntil timed out: ${label}`);
}

const probeHttp = (url: string) =>
  new Promise<boolean>((resolve) => {
    const req = httpRequest(url, { method: "GET", timeout: 1000 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });

const probeTcp = (host: string, port: number) =>
  new Promise<boolean>((resolve) => {
    const sock = createConnection({ host, port });
    sock.once("connect", () => {
      sock.end();
      resolve(true);
    });
    sock.once("error", () => resolve(false));
  });

const waitForHttpReady = (url: string, deadlineMs: number) =>
  pollUntil(() => probeHttp(url), deadlineMs, url);

const waitForTcpReady = (host: string, port: number, deadlineMs: number) =>
  pollUntil(() => probeTcp(host, port), deadlineMs, `${host}:${port}`);

function isXvfb(): boolean {
  return process.env.KLIPPEL_USE_XVFB === "1";
}

function cleanEnv(): NodeJS.ProcessEnv {
  // Inherit the parent env, then strip:
  //   - ELECTRON_RUN_AS_NODE: VS Code's Jest extension leaks this; if it
  //     reaches Electron the binary boots as plain Node and crashes on
  //     `app.isPackaged` (memory: feedback_unset_electron_run_as_node).
  //   - WAYLAND_DISPLAY / XDG_SESSION_TYPE under `KLIPPEL_USE_XVFB=1`:
  //     `xvfb-run` only sets `DISPLAY` (X11). If Electron also sees a
  //     Wayland hint inherited from the host session it picks the
  //     compositor and renders to the real screen — the window appears
  //     even in "headless" mode. Strip them so Electron falls back to
  //     the Xvfb X server. Same approach as `jest.globalSetup.ts`.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  if (isXvfb()) {
    delete env.WAYLAND_DISPLAY;
    delete env.XDG_SESSION_TYPE;
  }
  return env;
}

/**
 * CLI flags appended to every peer's Electron invocation when running
 * under Xvfb. Chromium's GPU + sandbox subsystems assume hardware not
 * provided by Xvfb, so on display-less CI hosts the renderer of the
 * second peer can hang for minutes (the first peer takes the only
 * available GPU process slot). `--disable-gpu` + `--no-sandbox`
 * eliminate both — production runs (`KLIPPEL_USE_XVFB` unset) keep
 * default behavior. We also pin the DevTools HTTP endpoint to
 * `127.0.0.1` so the harness's IPv4 probe reaches it: some hosts have
 * Electron default-binding to `::1` only, which the harness's
 * `waitForHttpReady` (also IPv4) silently misses.
 */
function headlessElectronArgs(): string[] {
  if (!isXvfb()) return [];
  return [
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--remote-debugging-address=127.0.0.1",
  ];
}

/**
 * Build the `stdio` argument for `spawn`. Without `debug`, peer + sync
 * output is routed to a temp log file rather than `/dev/null` so a hung
 * boot under Xvfb (or a crash in main) can be inspected. With `debug`,
 * everything streams to the host's stdio for live tailing.
 */
function logFileStdio(logPath: string, debug: boolean): StdioOptions {
  if (debug) return "inherit";
  const fd = openSync(logPath, "a");
  return ["ignore", fd, fd];
}

function spawnSyncServer(port: number, logPath: string, debug: boolean): ChildProcess {
  const child = spawn(
    JAZZ_RUN_BIN,
    ["sync", "--in-memory", "--host", "127.0.0.1", "--port", String(port)],
    {
      env: cleanEnv(),
      stdio: logFileStdio(logPath, debug),
      detached: false,
    },
  );
  child.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[collaborativeHarness] sync-server spawn error", err);
  });
  return child;
}

function spawnPeerProcess(opts: {
  envName: string;
  cdpPort: number;
  userDataDir: string;
  syncUrl: string;
  logPath: string;
  debug: boolean;
}): ChildProcess {
  const electronArgs = [".", ...headlessElectronArgs()];
  // Under Xvfb, every peer gets its own isolated X server via
  // `xvfb-run -a`. Two Electron processes sharing one Xvfb display were
  // crashing with `FATAL: Failed to shutdown` (SIGILL) — Chromium's
  // GPU/compositor + window-state machinery doesn't tolerate the
  // overlap. `-a` auto-picks a free display number per invocation.
  // Outside Xvfb (local dev) we keep the direct invocation so the
  // windows show up on the user's screen.
  const [cmd, args] = isXvfb()
    ? [
        "xvfb-run",
        [
          "-a",
          "--server-args=-screen 0 1280x1024x24",
          ELECTRON_BIN,
          ...electronArgs,
        ],
      ]
    : [ELECTRON_BIN, electronArgs];

  const child = spawn(cmd, args, {
    cwd: REPO_WEBAPP,
    env: {
      ...cleanEnv(),
      ENV_NAME: opts.envName,
      KLIPPEL_CDP_PORT: String(opts.cdpPort),
      KLIPPEL_USER_DATA_DIR: opts.userDataDir,
      KLIPPEL_JAZZ_SYNC_URL: opts.syncUrl,
    },
    stdio: logFileStdio(opts.logPath, opts.debug),
    detached: false,
  });
  child.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error(`[collaborativeHarness] peer "${opts.envName}" spawn error`, err);
  });
  return child;
}

/**
 * Best-effort log dump for boot/hang debugging. Reads the last few KB
 * of each captured stream so a timeout surfaces with the actual
 * electron / cojson output instead of a bare `waitForHttpReady` stack.
 */
function tailLog(logPath: string, maxBytes = 8192): string {
  if (!existsSync(logPath)) return "(no log)";
  try {
    const buf = readFileSync(logPath, "utf8");
    return buf.length > maxBytes ? `…${buf.slice(-maxBytes)}` : buf;
  } catch (err) {
    return `(could not read ${logPath}: ${err instanceof Error ? err.message : String(err)})`;
  }
}

async function cleanupPeer(peer: Peer): Promise<void> {
  try { await peer.browser.disconnect(); } catch { /* ignore */ }
  try { await killChild(peer.process); } catch { /* ignore */ }
  try { if (existsSync(peer.userDataDir)) rmSync(peer.userDataDir, { recursive: true, force: true }); } catch { /* ignore */ }
  try { if (existsSync(peer.envDir)) rmSync(peer.envDir, { recursive: true, force: true }); } catch { /* ignore */ }
}

async function killChild(child: ChildProcess, signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const t = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch { /* ignore */ }
      resolve();
    }, 3000);
    child.once("exit", () => {
      clearTimeout(t);
      resolve();
    });
    try { child.kill(signal); } catch { resolve(); }
  });
}

/**
 * Boot `count` Electron peers + one cojson sync server. Returns a
 * `CollaborativeHarness` with `peers[i].page` ready for puppeteer calls,
 * plus a `teardown()` that kills every spawned process and removes the
 * temp env/user-data dirs. Always call `teardown()` in `afterAll`.
 */
export async function spawnCollaborativePeers(
  opts: SpawnOpts,
): Promise<CollaborativeHarness> {
  assertBuilt();
  const debug = !!opts.debug;
  const prefix = opts.namePrefix ?? `collab-${Date.now()}`;

  const syncPort = await reservePort();
  const syncUrl = `ws://127.0.0.1:${syncPort}`;
  const syncLogPath = join(tmpdir(), `klippel-collab-sync-${prefix}.log`);
  const syncProcess = spawnSyncServer(syncPort, syncLogPath, debug);
  try {
    await waitForTcpReady("127.0.0.1", syncPort, 15_000);
  } catch (err) {
    throw new Error(
      `sync server never bound :${syncPort}\n--- sync log ---\n${tailLog(syncLogPath)}\n--- end ---\n${err instanceof Error ? err.message : err}`,
    );
  }

  const peers: Peer[] = [];
  try {
    for (let i = 0; i < opts.count; i += 1) {
      const letter = String.fromCharCode(97 + i); // a, b, c, …
      const envName = `${prefix}-${letter}`;
      const cdpPort = await reservePort();
      const userDataDir = join(tmpdir(), `klippel-${envName}`);
      const envDir = join(homedir(), "klippel", "envs", envName);
      const logPath = join(tmpdir(), `klippel-collab-${envName}.log`);

      // Pre-clean — a leftover env dir from a previous crashed run would
      // otherwise be reused and pollute the new peer's state.
      if (existsSync(userDataDir)) rmSync(userDataDir, { recursive: true, force: true });
      if (existsSync(envDir)) rmSync(envDir, { recursive: true, force: true });

      const proc = spawnPeerProcess({ envName, cdpPort, userDataDir, syncUrl, logPath, debug });

      try {
        await waitForHttpReady(`http://127.0.0.1:${cdpPort}/json/version`, 60_000);
      } catch (err) {
        throw new Error(
          `peer "${envName}" CDP never reached :${cdpPort}\n--- ${logPath} (tail) ---\n${tailLog(logPath)}\n--- end ---\n${err instanceof Error ? err.message : err}`,
        );
      }
      const browser = await puppeteer.connect({
        browserURL: `http://127.0.0.1:${cdpPort}`,
        defaultViewport: null,
      });
      const pages = await browser.pages();
      const page = pages.find((p) => p.url().includes("index.html")) ?? pages[0];
      if (!page) throw new Error(`peer ${envName}: no renderer page`);
      await page.waitForSelector("#ribbon-menu-tabs");

      peers.push({
        name: letter,
        envName,
        cdpPort,
        userDataDir,
        envDir,
        logPath,
        process: proc,
        browser,
        page,
      });
    }
  } catch (err) {
    for (const peer of peers) await cleanupPeer(peer);
    try { await killChild(syncProcess); } catch { /* ignore */ }
    throw err;
  }

  const teardown = async () => {
    for (const peer of peers) await cleanupPeer(peer);
    try { await killChild(syncProcess); } catch { /* ignore */ }
  };

  return {
    peers,
    sync: { url: syncUrl, port: syncPort, process: syncProcess, logPath: syncLogPath },
    teardown,
  };
}

