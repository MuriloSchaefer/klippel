/**
 * E2E tests for addProcess + addProcessShortcut. Skips if CDP unreachable.
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

import { addProcessTool } from '../addProcess';
import { addProcessShortcutTool } from '../addProcessShortcut';
import { deleteProcessTool } from '../deleteProcess';
import { deleteProcessShortcutTool } from '../deleteProcessShortcut';
import { openGarmentDetailsTool } from '../openGarmentDetails';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);
const rowSel = (label: string) =>
  `[data-testid="process-item"][data-process-label="${label}"]`;

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
  await resetWorkspace(page, 'e2e-processes-add');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E AddProcess ${id}`;
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
  cleanupWorkspace('e2e-processes-add');
});

beforeEach(async () => {
  if (page) await closeAllOpenContainers(page);
}, 15_000);

describe('addProcess via click (E2E)', () => {
  it('adds a process with default costs', async () => {
    const label = `pr-c-${uniqueSuffix()}`;
    await addProcessTool.execute({ name: label });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });
    await deleteProcessTool.execute({ label });
  }, 60_000);

  it('adds a process with custom cost amounts', async () => {
    const label = `pr-c-cost-${uniqueSuffix()}`;
    await addProcessTool.execute({
      name: label,
      costTime: { quotientAmount: 2, dividendAmount: 5 },
      costMoney: { quotientAmount: 10 },
    });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });
    const rowText = await page!.$eval(
      rowSel(label),
      (el) => (el as HTMLElement).innerText,
    );
    expect(rowText).toContain('2');
    expect(rowText).toContain('5');
    expect(rowText).toContain('10');
    await deleteProcessTool.execute({ label });
  }, 60_000);
});

describe('addProcess via shortcut (E2E)', () => {
  it('adds a process via the keyboard path', async () => {
    const label = `pr-s-${uniqueSuffix()}`;
    await addProcessShortcutTool.execute({ name: label });
    await page!.waitForSelector(rowSel(label), { timeout: 10_000 });
    await deleteProcessShortcutTool.execute({ label });
  }, 60_000);
});
