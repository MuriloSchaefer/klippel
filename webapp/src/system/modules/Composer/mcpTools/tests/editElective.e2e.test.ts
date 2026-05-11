/**
 * E2E tests for editElective + editElectiveShortcut. Skips if CDP unreachable.
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

import { addElectiveTool } from '../addElective';
import { addElectiveShortcutTool } from '../addElectiveShortcut';
import { editElectiveTool } from '../editElective';
import { editElectiveShortcutTool } from '../editElectiveShortcut';
import { deleteElectiveTool } from '../deleteElective';
import { deleteElectiveShortcutTool } from '../deleteElectiveShortcut';
import { openGarmentDetailsTool } from '../openGarmentDetails';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);
const rowSel = (label: string) =>
  `[data-testid="elective-item"][data-elective-label="${label}"]`;

const closeAllOpenContainers = async (p: Page) => {
  for (let i = 0; i < 5; i++) {
    const hasOpen =
      (await p.$('[role="pointer-panel-content"]')) ||
      (await p.$('ul[role="listbox"]'));
    if (!hasOpen) return;
    await p.keyboard.press('Escape');
    await p
      .waitForSelector('[role="pointer-panel-content"]', { hidden: true, timeout: 500 })
      .catch(() => {});
  }
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-electives-edit');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E EditElective ${id}`;
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
  cleanupWorkspace('e2e-electives-edit');
});

beforeEach(async () => {
  if (page) await closeAllOpenContainers(page);
}, 15_000);

describe('editElective via click (E2E)', () => {
  it('renames an elective and toggles isDefault on', async () => {
    const before = `el-c-${uniqueSuffix()}`;
    const after = `${before}-edited`;
    await addElectiveTool.execute({ name: before });
    await page!.waitForSelector(rowSel(before), { timeout: 10_000 });

    await editElectiveTool.execute({
      label: before,
      name: after,
      isDefault: true,
    });

    await page!.waitForSelector(rowSel(after), { timeout: 10_000 });
    await page!.waitForSelector(rowSel(before), { hidden: true, timeout: 5_000 });
    const rowText = await page!.$eval(
      rowSel(after),
      (el) => (el as HTMLElement).innerText,
    );
    expect(rowText).toContain('padrão: sim');
    await deleteElectiveTool.execute({ label: after });
  }, 60_000);
});

describe('editElective via shortcut (E2E)', () => {
  it('renames an elective via keyboard and toggles isDefault on', async () => {
    const before = `el-s-${uniqueSuffix()}`;
    const after = `${before}-edited`;
    await addElectiveShortcutTool.execute({ name: before });
    await page!.waitForSelector(rowSel(before), { timeout: 10_000 });

    await editElectiveShortcutTool.execute({
      label: before,
      name: after,
      isDefault: true,
    });

    await page!.waitForSelector(rowSel(after), { timeout: 10_000 });
    await page!.waitForSelector(rowSel(before), { hidden: true, timeout: 5_000 });
    const rowText = await page!.$eval(
      rowSel(after),
      (el) => (el as HTMLElement).innerText,
    );
    expect(rowText).toContain('padrão: sim');
    await deleteElectiveShortcutTool.execute({ label: after });
  }, 60_000);
});
