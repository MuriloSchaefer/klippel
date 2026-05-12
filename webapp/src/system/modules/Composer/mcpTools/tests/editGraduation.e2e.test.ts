/**
 * E2E tests for editGraduation (click + shortcut). Skips if CDP unreachable.
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
import { editGraduationTool } from '../editGraduation';
import { editGraduationShortcutTool } from '../editGraduationShortcut';
import { deleteGraduationTool } from '../deleteGraduation';
import { deleteGraduationShortcutTool } from '../deleteGraduationShortcut';
import { openGarmentDetailsTool } from '../openGarmentDetails';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);
const rowSel = (label: string) =>
  `[data-testid="graduation-item"][data-graduation-label="${label}"]`;
beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-graduations-edit');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E EditGraduation ${id}`;
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
  cleanupWorkspace('e2e-graduations-edit');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('editGraduation via click (E2E)', () => {
  it('renames a graduation', async () => {
    const oldLabel = `edit-c-${uniqueSuffix()}`;
    const newLabel = `${oldLabel}-renamed`;

    await addGraduationsTool.execute({ names: [oldLabel] });
    await page!.waitForSelector(rowSel(oldLabel), { timeout: 10_000 });

    await editGraduationTool.execute({
      label: oldLabel,
      changes: { label: newLabel, amount: 5 },
    });

    await page!.waitForSelector(rowSel(newLabel), { timeout: 10_000 });
    await deleteGraduationTool.execute({ label: newLabel });
  }, 60_000);
});

describe('editGraduation via shortcut (E2E)', () => {
  it('renames a graduation via the keyboard path', async () => {
    const oldLabel = `edit-s-${uniqueSuffix()}`;
    const newLabel = `${oldLabel}-renamed`;

    await addGraduationsShortcutTool.execute({ names: [oldLabel] });
    await page!.waitForSelector(rowSel(oldLabel), { timeout: 10_000 });

    await editGraduationShortcutTool.execute({
      label: oldLabel,
      changes: { label: newLabel },
    });

    await page!.waitForSelector(rowSel(newLabel), { timeout: 10_000 });
    await deleteGraduationShortcutTool.execute({ label: newLabel });
  }, 60_000);
});
