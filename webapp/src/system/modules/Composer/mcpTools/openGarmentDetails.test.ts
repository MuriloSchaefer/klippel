/**
 * E2E test for the openGarmentDetails MCP tool. Skips if CDP is unreachable.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '../../../testUtils/resetWorkspace';

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

import { openGarmentDetailsTool } from './openGarmentDetails';
import { createModelTool } from './createModel';
import { openModelTool } from './openModel';
import { switchRibbonTabTool } from '../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

describe('openGarmentDetails (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
    await resetWorkspace(page, 'e2e-openGarmentDetails', 'empty');

    await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
    await switchRibbonTabTool.execute({ label: 'Compositor' });
    await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

    const id = `e2e-${uniqueSuffix()}`;
    const name = `E2E OpenDetails ${id}`;
    await createModelTool.execute({ name, id });
    await page.waitForFunction(
      () => !document.querySelector('[role="pointer-panel-content"] #name'),
      { timeout: 10_000 },
    );
    await openModelTool.execute({ modelName: name });
  }, 45_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
    cleanupWorkspace('e2e-openGarmentDetails');
  });

  it('selects the garment and opens the details panel with accordion expanded', async () => {
    await openGarmentDetailsTool.execute();

    await page!.waitForFunction(
      () => {
        const panel = document.querySelector('[role="details-panel"]') as HTMLElement | null;
        return !!panel && window.getComputedStyle(panel).display !== 'none';
      },
      { timeout: 5000 },
    );
    await page!.waitForFunction(
      () =>
        document
          .querySelector('[role="accordion-Detalhes da Peça"] [aria-controls="accordion-Detalhes da Peça-content"]')
          ?.getAttribute('aria-expanded') === 'true',
      { timeout: 5000 },
    );
    await page!.waitForSelector('#garment-name', { timeout: 5000 });
  }, 30_000);
});
