import { setTimeout as sleep } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';

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

export default async function globalTeardown() {
  if (!(globalThis as any).__KLIPPEL_OWNED_PROCESS__) return;
  const pid = (globalThis as any).__KLIPPEL_DEV_PID__ as number | undefined;

  // Graceful path: ask Electron to quit via CDP. This unwinds the renderer,
  // main process, and GPU subprocess in order; without it `npm run dev`
  // (npm → electron-vite → electron) tends to leak the windowed app even
  // after SIGTERM on the process group.
  await Promise.race([closeViaCdp(), sleep(5000)]);

  if (!pid) return;

  // Even after Browser.close, the dev wrapper (npm + electron-vite watcher)
  // keeps running — tear down the whole group.
  killGroup(pid, 'SIGTERM');

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!(await cdpUp())) break;
    await sleep(250);
  }

  killGroup(pid, 'SIGKILL');
}
