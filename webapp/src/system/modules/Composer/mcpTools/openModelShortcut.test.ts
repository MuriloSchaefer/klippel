/**
 * E2E tests for the openModelShortcut MCP tool. Skips when CDP is unreachable.
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

import { createModelTool } from './createModel';
import { openModelShortcutTool } from './openModelShortcut';
import { switchRibbonTabTool } from '../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForFormClosed = async (p: Page) => {
  await p.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"] #name'),
    { timeout: 10_000 },
  );
};

const closeOpenModelModal = async (p: Page) => {
  await p.keyboard.press('Escape');
  await p
    .waitForFunction(
      () => !document.querySelector('[role="list-options"]'),
      { timeout: 5_000 },
    )
    .catch(() => {});
};

const closeAllOpenContainers = async (p: Page) => {
  for (let i = 0; i < 5; i++) {
    const hasOpen = await p.evaluate(
      () =>
        Boolean(
          document.querySelector('[role="pointer-panel"]') ||
            document.querySelector('[role="pointer-panel-content"]') ||
            document.querySelector('[role="list-options"]'),
        ),
    );
    if (!hasOpen) return;
    await p.keyboard.press('Escape');
    await p
      .waitForFunction(
        () =>
          !document.querySelector('[role="pointer-panel"]') &&
          !document.querySelector('[role="pointer-panel-content"]') &&
          !document.querySelector('[role="list-options"]'),
        { timeout: 500 },
      )
      .catch(() => {});
  }
};

describe('openModelShortcut (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20_000 });
    await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
    await switchRibbonTabTool.execute({ label: 'Compositor' });
    await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
  }, 30_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
  });

  beforeEach(async () => {
    if (page) await closeAllOpenContainers(page);
  }, 15_000);

  it('opens the selection modal when called with no arguments', async () => {
    const result = await openModelShortcutTool.execute();
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true, opened: true });
    await page!.waitForSelector('[role="list-options"]', { timeout: 5_000 });
    await closeOpenModelModal(page!);
  }, 15_000);

  it('opens a previously created model in a new viewport tab via the keyboard path', async () => {
    const id = `e2e-${uniqueSuffix()}`;
    const name = `E2E OpenShortcut ${id}`;
    await createModelTool.execute({ name, id });
    await waitForFormClosed(page!);

    const result = await openModelShortcutTool.execute({ modelName: name });
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true, modelName: name });

    await page!.waitForFunction(
      (target: string) => {
        const tab = document.querySelector(
          '[role="viewport-tabs"] [aria-selected="true"]',
        );
        return Boolean(tab && tab.textContent?.includes(target));
      },
      { timeout: 10_000 },
      name,
    );
  }, 30_000);

  it('rejects when the model name does not exist', async () => {
    await expect(
      openModelShortcutTool.execute({ modelName: `nonexistent-${uniqueSuffix()}` }),
    ).rejects.toThrow(/not found/);
    await closeOpenModelModal(page!);
  }, 20_000);
});
