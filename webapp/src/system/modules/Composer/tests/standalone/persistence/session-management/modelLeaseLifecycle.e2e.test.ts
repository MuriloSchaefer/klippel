/**
 * Phase 2c — Model edit-lease lifecycle.
 *
 * Lease lifecycle: `acquire` → `renew` → `release` round-trips through IPC.
 *
 * The Phase 2 plan calls for a two-instance lease-violation check; that
 * needs a second Electron node and is deferred to the Phase 6 cryptographic
 * enforcement work (when the receive-validator can prove the rejection).
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const TEST_WORKSPACE = `models-jazz-lease-${Math.floor(Math.random() * 1e6)}`;

let browser: Browser | null = null;
let page: Page | null = null;

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().includes('index.html')) ?? pages[0];
  if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}`);
  await resetWorkspace(page, TEST_WORKSPACE);
  await page.evaluate(async (n) => {
    await window.electron.jazz.ensureWorkspace(n);
  }, TEST_WORKSPACE);
});

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(TEST_WORKSPACE);
});

describe('Phase 2c — model edit-lease lifecycle', () => {
  it('lease lifecycle: acquire → renew → release', async () => {
    const id = `lease-${Math.floor(Math.random() * 1e6)}`;
    await page!.evaluate(
      async (input) => window.electron.jazz.createModel(input),
      { id, name: 'lease', graphJson: '{"nodes":{},"edges":{},"adjacencyList":{}}', description: '' },
    );

    const accountId = await page!.evaluate(async () => window.electron.jazz.getAccountId());
    expect(accountId).toBeTruthy();

    const acquired = await page!.evaluate(async (mid: string) => window.electron.jazz.acquireLease(mid), id);
    expect(acquired.holderAccountId).toBe(accountId);
    expect(acquired.expiresAt).toBeGreaterThan(Date.now());

    const renewed = await page!.evaluate(async (mid: string) => window.electron.jazz.renewLease(mid), id);
    expect(renewed.expiresAt).toBeGreaterThanOrEqual(acquired.expiresAt);

    await page!.evaluate(async (mid: string) => window.electron.jazz.releaseLease(mid), id);
    const loaded = await page!.evaluate(async (mid: string) => window.electron.jazz.loadModel(mid), id);
    expect(loaded!.editLease).toBeUndefined();
  }, 60_000);
});
