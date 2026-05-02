/**
 * E2E tests for the openModel MCP tool. Skips when CDP is unreachable.
 *
 * Creates a model via createModelTool, then opens it via openModelTool and
 * verifies a viewport tab is opened and selected for the chosen model.
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
import { openModelTool } from './openModel';
import { switchRibbonTabTool } from '../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForFormClosed = async (p: Page) => {
  await p.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"] #name'),
    { timeout: 10_000 },
  );
};

describe('openModel (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
    await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
    await switchRibbonTabTool.execute({ label: 'Compositor' });
    await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
  }, 20_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
  });

  it('opens a previously created model in a new viewport tab', async () => {
    const id = `e2e-open-${uniqueSuffix()}`;
    const name = `E2E Open ${id}`;
    await createModelTool.execute({ name, id });
    await waitForFormClosed(page!);

    const result = await openModelTool.execute({ modelName: name });
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });

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
      openModelTool.execute({ modelName: `nonexistent-${uniqueSuffix()}` }),
    ).rejects.toThrow(/not found/);
    await page!.keyboard.press('Escape');
    await page!.waitForFunction(
      () => !document.querySelector('[role="list-options"]'),
      { timeout: 5_000 },
    ).catch(() => {});
  }, 20_000);
});
