/**
 * E2E tests for deleteElective + deleteElectiveShortcut. Skips if CDP unreachable.
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
import { deleteElectiveTool } from '../deleteElective';
import { deleteElectiveShortcutTool } from '../deleteElectiveShortcut';
import { openGarmentDetailsTool } from '../openGarmentDetails';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);
const rowSel = (label: string) =>
  `[data-testid="elective-item"][data-elective-label="${label}"]`;

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-electives-delete');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E DeleteElective ${id}`;
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
  cleanupWorkspace('e2e-electives-delete');
});

describe('deleteElective via click (E2E)', () => {
  it('deletes an elective by label', async () => {
    const label = `del-c-${uniqueSuffix()}`;
    await addElectiveTool.execute({ name: label });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });

    await deleteElectiveTool.execute({ label });

    await page!.waitForSelector(rowSel(label), { hidden: true, timeout: 5_000 });
  }, 60_000);
});

describe('deleteElective via shortcut (E2E)', () => {
  it('deletes an elective by focusing its row and pressing d', async () => {
    const label = `del-s-${uniqueSuffix()}`;
    await addElectiveShortcutTool.execute({ name: label });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });

    await deleteElectiveShortcutTool.execute({ label });

    await page!.waitForSelector(rowSel(label), { hidden: true, timeout: 5_000 });
  }, 60_000);
});
