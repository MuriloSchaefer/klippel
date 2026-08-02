/**
 * Phase 2c — Models on Jazz CoValues round-trip + persistence.
 *
 *   1. Create a model and write a non-trivial graph; `loadModel` round-trips it.
 *   2. Close + reopen the workspace; SQLite-backed `loadModel` rehydrates.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const TEST_WORKSPACE = `models-jazz-roundtrip-${Math.floor(Math.random() * 1e6)}`;

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
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(TEST_WORKSPACE);
});

describe('Phase 2c — Models on Jazz CoValues (round-trip)', () => {
  it('createModel + loadModel round-trip the graph JSON', async () => {
    const id = `model-${Math.floor(Math.random() * 1e6)}`;
    const graphJson = JSON.stringify({
      id,
      nodes: { garment: { id: 'garment', type: 'GARMENT', label: 'Garment', position: { x: 0, y: 0 } } },
      edges: {},
      adjacencyList: {},
    });

    const summary = await page!.evaluate(
      async (input) => window.electron.jazz.createModel(input),
      { id, name: 'Phase 2c model', graphJson, description: '' },
    );
    expect(summary.id).toBe(id);

    const loaded = await page!.evaluate(async (mid) => window.electron.jazz.loadModel(mid), id);
    expect(loaded).toBeTruthy();
    expect(loaded!.graphJson).toBe(graphJson);
    expect(loaded!.hasSvg).toBe(false);
  }, 60_000);

  it('persists updateModelGraph across workspace close + reopen', async () => {
    const id = `persist-${Math.floor(Math.random() * 1e6)}`;
    const initial = JSON.stringify({ id, nodes: {}, edges: {}, adjacencyList: {} });
    await page!.evaluate(
      async (input) => window.electron.jazz.createModel(input),
      { id, name: 'persists', graphJson: initial, description: '' },
    );

    const updated = JSON.stringify({
      id,
      nodes: { garment: { id: 'garment', type: 'GARMENT', label: 'G', position: { x: 0, y: 0 } } },
      edges: {},
      adjacencyList: {},
    });
    await page!.evaluate(
      async (args: { mid: string; g: string }) =>
        window.electron.jazz.updateModelGraph(args.mid, args.g),
      { mid: id, g: updated },
    );

    // Close + reopen the workspace; jazz.sqlite must rehydrate the model.
    await page!.evaluate(async () => window.electron.jazz.closeWorkspace());
    await page!.evaluate(async (n: string) => window.electron.jazz.ensureWorkspace(n), TEST_WORKSPACE);

    const reloaded = await page!.evaluate(async (mid: string) => window.electron.jazz.loadModel(mid), id);
    expect(reloaded).toBeTruthy();
    expect(reloaded!.graphJson).toBe(updated);
  }, 90_000);
});
