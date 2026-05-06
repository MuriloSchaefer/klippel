/**
 * E2E tests for the deleteMaterial functionality (click + shortcut).
 * Skips if CDP is unreachable.
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
import { addMaterialShortcutTool } from './addMaterialShortcut';
import { deleteMaterialTool } from './deleteMaterial';
import { deleteMaterialShortcutTool } from './deleteMaterialShortcut';
import { createModelTool } from './createModel';
import { openModelTool } from './openModel';
import { switchRibbonTabTool } from '../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForFormClosed = async (p: Page) => {
  await p.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"] #name'),
    { timeout: 10_000 },
  );
};

const rowSel = (label: string) =>
  `[data-testid="material-item"][data-material-label="${label}"]`;

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-deleteMaterial', 'empty');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E DeleteMaterial ${id}`;
  await createModelTool.execute({ name, id });
  await waitForFormClosed(page);
  await openModelTool.execute({ modelName: name });
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-deleteMaterial');
});

describe('deleteMaterial via click (E2E)', () => {
  it('deletes a material node by label', async () => {
    const label = 'Tricoline (delete-test)';
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

    await deleteMaterialTool.execute({ label });

    await page!.waitForFunction(
      (sel: string) => !document.querySelector(sel),
      { timeout: 10_000 },
      rowSel(label),
    );
  }, 30_000);
});

describe('deleteMaterial via shortcut (E2E)', () => {
  it('deletes a material node via "d" on the focused row', async () => {
    const label = 'Tricoline (delete-shortcut-test)';
    await ensureSettingsPanelExpanded(page!);
    await expandAccordion(page!, 'Materiais');
    const exists = await page!.$(rowSel(label));
    if (exists) await deleteMaterialShortcutTool.execute({ label });
    await addMaterialShortcutTool.execute({
      label,
      type: 'tecido',
      material: 'tricoline',
    });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });

    await deleteMaterialShortcutTool.execute({ label });

    await page!.waitForFunction(
      (sel: string) => !document.querySelector(sel),
      { timeout: 10_000 },
      rowSel(label),
    );
  }, 30_000);
});
