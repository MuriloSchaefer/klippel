import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}/json/version`;
const STARTUP_TIMEOUT_MS = Number(process.env.KLIPPEL_STARTUP_TIMEOUT_MS ?? 90_000);

const probeCdp = (): Promise<boolean> =>
  new Promise((resolve) => {
    const req = httpRequest(CDP_URL, { method: 'GET', timeout: 1000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });

export default async function globalSetup() {
  if (await probeCdp()) {
    (globalThis as any).__KLIPPEL_OWNED_PROCESS__ = false;
    return;
  }

  const useXvfb = process.env.KLIPPEL_USE_XVFB === '1';
  const cmd = useXvfb ? 'xvfb-run' : 'yarn';
  const args = useXvfb ? ['-a', 'yarn', 'dev'] : ['dev'];

  const child = spawn(cmd, args, {
    cwd: process.cwd(),
    stdio: process.env.KLIPPEL_DEV_LOG === '1' ? 'inherit' : 'ignore',
    detached: true,
    env: { ...process.env },
  });
  child.unref();

  (globalThis as any).__KLIPPEL_DEV_PID__ = child.pid;
  (globalThis as any).__KLIPPEL_OWNED_PROCESS__ = true;

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await probeCdp()) return;
    await sleep(500);
  }
  throw new Error(`Klippel dev app did not expose CDP on :${CDP_PORT} within ${STARTUP_TIMEOUT_MS}ms`);
}
