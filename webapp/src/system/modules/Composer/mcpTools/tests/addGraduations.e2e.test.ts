/**
 * E2E tests for addGraduations (click + shortcut).
 * Skips silently if CDP is unreachable.
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

import { addGraduationsTool } from '../addGraduations';
import { addGraduationsShortcutTool } from '../addGraduationsShortcut';
import { deleteGraduationTool } from '../deleteGraduation';
import { deleteGraduationShortcutTool } from '../deleteGraduationShortcut';
import { openGarmentDetailsTool } from '../openGarmentDetails';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const rowSel = (label: string) =>
  `[data-testid="graduation-item"][data-graduation-label="${label}"]`;
const deleteIfExists = async (
  label: string,
  tool: { execute: (input: { label: string }) => Promise<unknown> },
) => {
  if (!page) return;
  const exists = await page.$(rowSel(label));
  if (!exists) return;
  await tool.execute({ label });
  await page.waitForSelector(rowSel(label), { hidden: true, timeout: 5_000 });
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-graduations');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E Graduations ${id}`;
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
  cleanupWorkspace('e2e-graduations');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('addGraduations via click (E2E)', () => {
  it('adds multiple graduations from a comma-separated list', async () => {
    const labels = [`P-c-${uniqueSuffix()}`, `M-c-${uniqueSuffix()}`, `G-c-${uniqueSuffix()}`];
    for (const l of labels) await deleteIfExists(l, deleteGraduationTool);

    await addGraduationsTool.execute({ names: labels });

    for (const l of labels) {
      await page!.waitForSelector(rowSel(l), { timeout: 10_000 });
    }

    for (const l of labels) await deleteGraduationTool.execute({ label: l });
  }, 60_000);
});

describe('addGraduations via shortcut (E2E)', () => {
  it('opens the panel when called with no arguments', async () => {
    const result = await addGraduationsShortcutTool.execute();
    expect(JSON.parse(result.content[0].text)).toMatchObject({ success: true, opened: true });
    await page!.waitForSelector('[role="pointer-panel-content"] [data-testid="add-graduation-form"]');
    await page!.keyboard.press('Escape');
  }, 30_000);

  it('adds multiple graduations via the keyboard path', async () => {
    const labels = [`P-s-${uniqueSuffix()}`, `M-s-${uniqueSuffix()}`];
    for (const l of labels) await deleteIfExists(l, deleteGraduationShortcutTool);

    await addGraduationsShortcutTool.execute({ names: labels });

    for (const l of labels) {
      await page!.waitForSelector(rowSel(l), { timeout: 10_000 });
    }

    for (const l of labels) await deleteGraduationShortcutTool.execute({ label: l });
  }, 60_000);
});
