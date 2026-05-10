/**
 * E2E tests for the renameGarment functionality (click + shortcut).
 * Skips if CDP is unreachable.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '../../../../../helpers/puppeteer/resetWorkspace';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { renameGarmentTool } from '../renameGarment';
import { renameGarmentShortcutTool } from '../renameGarmentShortcut';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-renameGarment');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E Rename ${id}`;
  await createModelTool.execute({ name, id });
  await page.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
  await openModelTool.execute({ modelName: name });
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-renameGarment');
});

describe('renameGarment via click (E2E)', () => {
  it('renames the garment via DOM clicks', async () => {
    const newName = `Peça Click ${Math.floor(Math.random() * 1e5)}`;
    await renameGarmentTool.execute({ name: newName });

    const value = await page!.$eval('#garment-name', (el) => (el as HTMLInputElement).value);
    expect(value).toBe(newName);
  }, 30_000);
});

describe('renameGarment via shortcut (E2E)', () => {
  it('renames the garment via the keyboard path', async () => {
    const newName = `Peça Shortcut ${Math.floor(Math.random() * 1e5)}`;
    await renameGarmentShortcutTool.execute({ name: newName });

    const value = await page!.$eval('#garment-name', (el) => (el as HTMLInputElement).value);
    expect(value).toBe(newName);
  }, 30_000);
});
