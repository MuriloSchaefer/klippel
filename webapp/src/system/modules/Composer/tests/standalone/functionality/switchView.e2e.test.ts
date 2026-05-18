/**
 * E2E tests for the switchView and switchViewShortcut MCP tools. Skips if CDP is unreachable.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { switchViewShortcutTool } from '@system/modules/Composer/mcpTools/switchViewShortcut';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const GRAPH_BUTTON_SELECTOR = '#composer-view-graph';
const SVG_BUTTON_SELECTOR = '#composer-view-svg';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForFormClosed = async (p: Page) => {
  await p.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
};

const waitForView = async (view: 'graph' | 'svg') => {
  if (!page) throw new Error('No page');
  await page.waitForSelector(
    `#composer-active-view[data-active-view="${view}"]`,
    { timeout: 10_000 },
  );
};

describe('switchView (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
    await resetWorkspace(page, 'e2e-switchView');

    await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
    await switchRibbonTabTool.execute({ label: 'Compositor' });
    await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

    const id = `e2e-${uniqueSuffix()}`;
    const name = `E2E ${id}`;
    await createModelTool.execute({ name, id });
    await waitForFormClosed(page);
    await openModelTool.execute({ modelName: name });

    await page.waitForSelector(GRAPH_BUTTON_SELECTOR, { timeout: 10_000 });
    await page.waitForSelector(SVG_BUTTON_SELECTOR, { timeout: 10_000 });
  }, 45_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
    cleanupWorkspace('e2e-switchView');
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
      await switchViewShortcutTool.execute({ view: 'graph' });
      await waitForView('graph');
      await switchViewShortcutTool.execute({ view: 'svg' });
      await waitForView('svg');
    }, 20_000);

    it('switches to graph view via the "1" shortcut key', async () => {
      await switchViewShortcutTool.execute({ view: 'svg' });
      await waitForView('svg');
      await switchViewShortcutTool.execute({ view: 'graph' });
      await waitForView('graph');
    }, 20_000);
  });
});
