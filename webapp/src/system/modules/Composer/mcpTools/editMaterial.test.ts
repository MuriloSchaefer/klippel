/**
 * E2E test for the editMaterial MCP tool. Skips if CDP is unreachable.
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
import { editMaterialTool } from './editMaterial';
import { deleteMaterialTool } from './deleteMaterial';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';

const rowSel = (label: string) =>
  `[data-testid="material-item"][data-material-label="${label}"]`;

describe('editMaterial (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
  }, 15_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
  });

  it('edits a material node by id', async () => {
    const label = 'Tricoline (edit-test)';
    await ensureSettingsPanelExpanded(page!);
    await expandAccordion(page!, 'Materiais');
    const exists = await page!.$(rowSel(label));
    if (exists) await deleteMaterialTool.execute({ label });
    await addMaterialTool.execute({
      label,
      type: 'tecido',
      material: 'tricoline',
    });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });

    await editMaterialTool.execute({ label, materialId: 14 });

    // Form closed; row still exists.
    await page!.waitForFunction(
      () => !document.querySelector('[data-testid="edit-material-form"]'),
      { timeout: 5_000 },
    );
    await page!.waitForSelector(rowSel(label));

    await deleteMaterialTool.execute({ label });
  }, 60_000);

  it('rejects when neither materialId nor material is provided', async () => {
    await expect(
      editMaterialTool.execute({ label: 'nonexistent' } as any),
    ).rejects.toThrow();
  }, 30_000);
});
