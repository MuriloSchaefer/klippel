/**
 * E2E tests for addElective + addElectiveShortcut. Skips if CDP unreachable.
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

import { addElectiveTool } from '@system/modules/Composer/mcpTools/addElective';
import { addElectiveShortcutTool } from '@system/modules/Composer/mcpTools/addElectiveShortcut';
import { deleteElectiveTool } from '@system/modules/Composer/mcpTools/deleteElective';
import { deleteElectiveShortcutTool } from '@system/modules/Composer/mcpTools/deleteElectiveShortcut';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);
const rowSel = (label: string) =>
  `[data-testid="elective-item"][data-elective-label="${label}"]`;
beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-electives-add');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E AddElective ${id}`;
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
  cleanupWorkspace('e2e-electives-add');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('addElective via click (E2E)', () => {
  it('adds an elective with default off', async () => {
    const label = `el-c-${uniqueSuffix()}`;
    await addElectiveTool.execute({ name: label });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });
    await deleteElectiveTool.execute({ label });
  }, 60_000);

  it('adds an elective with isDefault=true and reflects "padrão: sim" on the row', async () => {
    const label = `el-c-def-${uniqueSuffix()}`;
    await addElectiveTool.execute({ name: label, isDefault: true });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });
    const rowText = await page!.$eval(
      rowSel(label),
      (el) => (el as HTMLElement).innerText,
    );
    expect(rowText).toContain('padrão: sim');
    await deleteElectiveTool.execute({ label });
  }, 60_000);
});

describe('addElective via shortcut (E2E)', () => {
  it('adds an elective via the keyboard path', async () => {
    const label = `el-s-${uniqueSuffix()}`;
    await addElectiveShortcutTool.execute({ name: label });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });
    await deleteElectiveShortcutTool.execute({ label });
  }, 60_000);

  it('adds an elective with isDefault=true via keyboard', async () => {
    const label = `el-s-def-${uniqueSuffix()}`;
    await addElectiveShortcutTool.execute({ name: label, isDefault: true });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });
    const rowText = await page!.$eval(
      rowSel(label),
      (el) => (el as HTMLElement).innerText,
    );
    expect(rowText).toContain('padrão: sim');
    await deleteElectiveShortcutTool.execute({ label });
  }, 60_000);
});
