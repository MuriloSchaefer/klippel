/**
 * E2E tests for editProcess + editProcessShortcut. Skips if CDP unreachable.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '../../../../../helpers/puppeteer/resetWorkspace';
import { closeOpenOverlays } from '../../../../../helpers/puppeteer/closeOverlays';

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

import { addProcessTool } from '../addProcess';
import { addProcessShortcutTool } from '../addProcessShortcut';
import { editProcessTool } from '../editProcess';
import { editProcessShortcutTool } from '../editProcessShortcut';
import { deleteProcessTool } from '../deleteProcess';
import { deleteProcessShortcutTool } from '../deleteProcessShortcut';
import { openGarmentDetailsTool } from '../openGarmentDetails';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);
const rowSel = (label: string) =>
  `[data-testid="process-item"][data-process-label="${label}"]`;
beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-processes-edit');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E EditProcess ${id}`;
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
  cleanupWorkspace('e2e-processes-edit');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('editProcess via click (E2E)', () => {
  it('renames a process', async () => {
    const before = `pr-c-${uniqueSuffix()}`;
    const after = `${before}-edited`;
    await addProcessTool.execute({ name: before });
    await page!.waitForSelector(rowSel(before), { timeout: 10_000 });

    await editProcessTool.execute({ label: before, name: after });

    await page!.waitForSelector(rowSel(after), { timeout: 10_000 });
    await page!.waitForSelector(rowSel(before), { hidden: true, timeout: 5_000 });
    await deleteProcessTool.execute({ label: after });
  }, 60_000);
});

describe('editProcess via shortcut (E2E)', () => {
  it('renames a process via keyboard', async () => {
    const before = `pr-s-${uniqueSuffix()}`;
    const after = `${before}-edited`;
    await addProcessShortcutTool.execute({ name: before });
    await page!.waitForSelector(rowSel(before), { timeout: 10_000 });

    await editProcessShortcutTool.execute({ label: before, name: after });

    await page!.waitForSelector(rowSel(after), { timeout: 10_000 });
    await page!.waitForSelector(rowSel(before), { hidden: true, timeout: 5_000 });
    await deleteProcessShortcutTool.execute({ label: after });
  }, 60_000);
});
