/**
 * E2E tests for linkProcessMaterial + linkProcessMaterialShortcut. Skips if CDP unreachable.
 *
 * Asserts the link is wired through the graph by reading the
 * `material-cost-info` cell on the material row (changes away from
 * "não utilizado" once a process consumes it).
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';
import { closeOpenOverlays } from '@helpers/puppeteer/closeOverlays';

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

import { addMaterialTool } from '@system/modules/Composer/mcpTools/addMaterial';
import { addMaterialShortcutTool } from '@system/modules/Composer/mcpTools/addMaterialShortcut';
import { addProcessTool } from '@system/modules/Composer/mcpTools/addProcess';
import { addProcessShortcutTool } from '@system/modules/Composer/mcpTools/addProcessShortcut';
import { deleteProcessTool } from '@system/modules/Composer/mcpTools/deleteProcess';
import { deleteProcessShortcutTool } from '@system/modules/Composer/mcpTools/deleteProcessShortcut';
import { deleteMaterialTool } from '@system/modules/Composer/mcpTools/deleteMaterial';
import { deleteMaterialShortcutTool } from '@system/modules/Composer/mcpTools/deleteMaterialShortcut';
import { linkProcessMaterialTool } from '@system/modules/Composer/mcpTools/linkProcessMaterial';
import { linkProcessMaterialShortcutTool } from '@system/modules/Composer/mcpTools/linkProcessMaterialShortcut';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import {
  readMaterialCostInfoText,
} from '@system/modules/Composer/components/viewports/MaterialListAccordion/components/drivers/ShowMaterial.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-process-link-material');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await page.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
  await openModelTool.execute({ modelName: name });
  await openGarmentDetailsTool.execute();
}, 60_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-process-link-material');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('linkProcessMaterial via click (E2E)', () => {
  it('links a process to a material and the material row reports consumption', async () => {
    const materialLabel = `mat-c-${uniqueSuffix()}`;
    const processLabel = `pr-c-${uniqueSuffix()}`;

    await addMaterialTool.execute({
      label: materialLabel,
      type: 'malha',
      materialId: 1,
    });
    await addProcessTool.execute({ name: processLabel });

    await linkProcessMaterialTool.execute({ processLabel, materialLabel });

    await expandAccordion(page!, 'Materiais');
    const costInfo = await readMaterialCostInfoText(page!, materialLabel);
    expect(costInfo.trim()).not.toBe('não utilizado');

    await deleteProcessTool.execute({ label: processLabel });
    await deleteMaterialTool.execute({ label: materialLabel });
  }, 45_000);
});

describe('linkProcessMaterial via shortcut (E2E)', () => {
  it('links a process to a material via keyboard and the material row reports consumption', async () => {
    const materialLabel = `mat-s-${uniqueSuffix()}`;
    const processLabel = `pr-s-${uniqueSuffix()}`;

    await addMaterialShortcutTool.execute({
      label: materialLabel,
      type: 'malha',
      materialId: 1,
    });
    await addProcessShortcutTool.execute({ name: processLabel });

    await linkProcessMaterialShortcutTool.execute({
      processLabel,
      materialLabel,
    });

    await expandAccordion(page!, 'Materiais');
    const costInfo = await readMaterialCostInfoText(page!, materialLabel);
    expect(costInfo.trim()).not.toBe('não utilizado');

    await deleteProcessShortcutTool.execute({ label: processLabel });
    await deleteMaterialShortcutTool.execute({ label: materialLabel });
  }, 45_000);
});
