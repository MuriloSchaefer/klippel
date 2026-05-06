/**
 * E2E test for the editMaterial MCP tool. Skips if CDP is unreachable.
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

import { addMaterialTool } from './addMaterial';
import { editMaterialTool } from './editMaterial';
import { deleteMaterialTool } from './deleteMaterial';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';
import { createModelTool } from './createModel';
import { openModelTool } from './openModel';
import { switchRibbonTabTool } from '../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const rowSel = (label: string) =>
  `[data-testid="material-item"][data-material-label="${label}"]`;

const waitForFormClosed = async (p: Page) => {
  await p.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"] #name'),
    { timeout: 10_000 },
  );
};

const closeAllOpenContainers = async (p: Page) => {
  for (let i = 0; i < 5; i++) {
    const hasOpen = await p.evaluate(
      () =>
        Boolean(
          document.querySelector('[role="pointer-panel"]') ||
            document.querySelector('[role="pointer-panel-content"]') ||
            document.querySelector('[role="list-options"]') ||
            document.querySelector('ul[role="listbox"]'),
        ),
    );
    if (!hasOpen) return;
    await p.keyboard.press('Escape');
    await p
      .waitForFunction(
        () =>
          !document.querySelector('[role="pointer-panel"]') &&
          !document.querySelector('[role="pointer-panel-content"]') &&
          !document.querySelector('[role="list-options"]') &&
          !document.querySelector('ul[role="listbox"]'),
        { timeout: 500 },
      )
      .catch(() => {});
  }
};

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

describe('editMaterial (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
    await resetWorkspace(page, 'e2e-editMaterial', 'empty');

    await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
    await switchRibbonTabTool.execute({ label: 'Compositor' });
    await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

    const id = `e2e-${uniqueSuffix()}`;
    const name = `E2E ${id}`;
    await createModelTool.execute({ name, id });
    await waitForFormClosed(page);
    await openModelTool.execute({ modelName: name });
  }, 45_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
    cleanupWorkspace('e2e-editMaterial');
  });

  beforeEach(async () => {
    if (page) await closeAllOpenContainers(page);
  }, 15_000);

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
