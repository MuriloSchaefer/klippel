/**
 * E2E tests for the switchView and switchViewShortcut MCP tools. Skips if CDP is unreachable.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { switchViewTool } from './switchView';
import { switchViewShortcutTool } from './switchViewShortcut';

const SVG_VIEW_SELECTOR = '#svg-editor-wrapper';
const GRAPH_BUTTON_SELECTOR = '#composer-view-graph';
const SVG_BUTTON_SELECTOR = '#composer-view-svg';

const waitForView = async (view: 'graph' | 'svg') => {
  if (!page) throw new Error('No page');
  if (view === 'svg') {
    await page.waitForSelector(SVG_VIEW_SELECTOR, { timeout: 10_000 });
  } else {
    await page.waitForFunction(
      (sel: string) => !document.querySelector(sel),
      { timeout: 10_000 },
      SVG_VIEW_SELECTOR,
    );
  }
};

describe('switchView (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
    await page.waitForSelector(GRAPH_BUTTON_SELECTOR, { timeout: 10_000 });
    await page.waitForSelector(SVG_BUTTON_SELECTOR, { timeout: 10_000 });
  }, 15_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
  });

  describe('switchView tool', () => {
    it('switches to svg view via the toolbar button', async () => {
      await switchViewTool.execute({ view: 'svg' });
      await waitForView('svg');
    }, 20_000);

    it('switches to graph view via the toolbar button', async () => {
      await switchViewTool.execute({ view: 'svg' });
      await waitForView('svg');
      await switchViewTool.execute({ view: 'graph' });
      await waitForView('graph');
    }, 20_000);

    it('is idempotent when toggling to the already-active view', async () => {
      await switchViewTool.execute({ view: 'graph' });
      await waitForView('graph');
      await switchViewTool.execute({ view: 'graph' });
      await waitForView('graph');
    }, 20_000);
  });

  describe('switchViewShortcut tool', () => {
    it('switches to svg view via the "2" shortcut key', async () => {
      await switchViewTool.execute({ view: 'graph' });
      await waitForView('graph');
      await switchViewShortcutTool.execute({ view: 'svg' });
      await waitForView('svg');
    }, 20_000);

    it('switches to graph view via the "1" shortcut key', async () => {
      await switchViewTool.execute({ view: 'svg' });
      await waitForView('svg');
      await switchViewShortcutTool.execute({ view: 'graph' });
      await waitForView('graph');
    }, 20_000);
  });
});
