/**
 * E2E test for the deleteMaterial MCP tool. Skips if CDP is unreachable.
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

import { addMaterialTool } from './addMaterial';
import { deleteMaterialTool } from './deleteMaterial';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';

describe('deleteMaterial (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
  }, 15_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
  });

  it('deletes a material node by label', async () => {
    const label = 'Tricoline (delete-test)';
    await ensureSettingsPanelExpanded(page!);
    await expandAccordion(page!, 'Materiais');
    const exists = await page!.$(`[data-testid="material-item"][data-material-label="${label}"]`);
    if (exists) await deleteMaterialTool.execute({ label });
    await addMaterialTool.execute({
      label,
      type: 'tecido',
      material: 'tricoline',
    });
    await page!.waitForSelector(
      `[data-testid="material-item"][data-material-label="${label}"]`,
      { timeout: 10_000 },
    );

    await deleteMaterialTool.execute({ label });

    await page!.waitForFunction(
      (sel: string) => !document.querySelector(sel),
      { timeout: 10_000 },
      `[data-testid="material-item"][data-material-label="${label}"]`,
    );
  }, 30_000);
});
