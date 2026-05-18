/**
 * E2E tests for reorderGraduation (click + shortcut). Skips if CDP unreachable.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';

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

import { addGraduationsTool } from '@system/modules/Composer/mcpTools/addGraduations';
import { addGraduationsShortcutTool } from '@system/modules/Composer/mcpTools/addGraduationsShortcut';
import { deleteGraduationTool } from '@system/modules/Composer/mcpTools/deleteGraduation';
import { deleteGraduationShortcutTool } from '@system/modules/Composer/mcpTools/deleteGraduationShortcut';
import { reorderGraduationTool } from '@system/modules/Composer/mcpTools/reorderGraduation';
import { reorderGraduationShortcutTool } from '@system/modules/Composer/mcpTools/reorderGraduationShortcut';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const getOrderedLabels = async (p: Page): Promise<string[]> =>
  p.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid="graduation-item"]'),
    );
    return rows.map((r) => r.getAttribute('data-graduation-label') ?? '');
  });

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-graduations-reorder');

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
  cleanupWorkspace('e2e-graduations-reorder');
});

describe('reorderGraduation via click (E2E)', () => {
  it('moves a graduation up by one step', async () => {
    const labels = [`r-c-a-${uniqueSuffix()}`, `r-c-b-${uniqueSuffix()}`, `r-c-c-${uniqueSuffix()}`];
    await addGraduationsTool.execute({ names: labels });
    for (const l of labels) {
      await page!.waitForSelector(`[data-graduation-label="${l}"]`, { timeout: 10_000 });
    }

    await reorderGraduationTool.execute({ label: labels[2], direction: 'up', steps: 1 });

    const ordered = await getOrderedLabels(page!);
    const subset = ordered.filter((l) => labels.includes(l));
    expect(subset).toEqual([labels[0], labels[2], labels[1]]);

    for (const l of labels) await deleteGraduationTool.execute({ label: l });
  }, 30_000);
});

describe('reorderGraduation via shortcut (E2E)', () => {
  it('moves a graduation down via s', async () => {
    const labels = [`r-s-a-${uniqueSuffix()}`, `r-s-b-${uniqueSuffix()}`, `r-s-c-${uniqueSuffix()}`];
    await addGraduationsShortcutTool.execute({ names: labels });
    for (const l of labels) {
      await page!.waitForSelector(`[data-graduation-label="${l}"]`, { timeout: 10_000 });
    }

    await reorderGraduationShortcutTool.execute({ label: labels[0], direction: 'down', steps: 1 });

    const ordered = await getOrderedLabels(page!);
    const subset = ordered.filter((l) => labels.includes(l));
    expect(subset).toEqual([labels[1], labels[0], labels[2]]);

    for (const l of labels) await deleteGraduationShortcutTool.execute({ label: l });
  }, 30_000);
});
