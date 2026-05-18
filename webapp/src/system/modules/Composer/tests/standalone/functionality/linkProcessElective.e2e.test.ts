/**
 * E2E tests for linkProcessElective + linkProcessElectiveShortcut. Skips if CDP unreachable.
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
import { addProcessTool } from '@system/modules/Composer/mcpTools/addProcess';
import { addProcessShortcutTool } from '@system/modules/Composer/mcpTools/addProcessShortcut';
import { deleteProcessTool } from '@system/modules/Composer/mcpTools/deleteProcess';
import { deleteProcessShortcutTool } from '@system/modules/Composer/mcpTools/deleteProcessShortcut';
import { deleteElectiveTool } from '@system/modules/Composer/mcpTools/deleteElective';
import { deleteElectiveShortcutTool } from '@system/modules/Composer/mcpTools/deleteElectiveShortcut';
import { linkProcessElectiveTool } from '@system/modules/Composer/mcpTools/linkProcessElective';
import { linkProcessElectiveShortcutTool } from '@system/modules/Composer/mcpTools/linkProcessElectiveShortcut';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);
const processRowSel = (label: string) =>
  `[data-testid="process-item"][data-process-label="${label}"]`;
const chipTextOnRow = async (p: Page, processLabel: string) =>
  p.evaluate((sel: string) => {
    const row = document.querySelector(sel);
    if (!row) return null;
    const labels = row.querySelectorAll('.MuiChip-label');
    return Array.from(labels)
      .map((l) => (l.textContent ?? '').trim())
      .filter(Boolean);
  }, processRowSel(processLabel));

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-process-link-elective');

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
  cleanupWorkspace('e2e-process-link-elective');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('linkProcessElective via click (E2E)', () => {
  it('links a process to an elective and shows the chip on the row', async () => {
    const electiveLabel = `el-c-${uniqueSuffix()}`;
    const processLabel = `pr-c-${uniqueSuffix()}`;

    await addElectiveTool.execute({ name: electiveLabel });
    await addProcessTool.execute({ name: processLabel });
    await page!.waitForSelector(processRowSel(processLabel), { timeout: 10_000 });

    await linkProcessElectiveTool.execute({
      processLabel,
      electiveLabel,
    });

    const chips = await chipTextOnRow(page!, processLabel);
    expect(chips).toContain(electiveLabel);

    await deleteProcessTool.execute({ label: processLabel });
    await deleteElectiveTool.execute({ label: electiveLabel });
  }, 30_000);
});

describe('linkProcessElective via shortcut (E2E)', () => {
  it('links a process to an elective via keyboard and shows the chip', async () => {
    const electiveLabel = `el-s-${uniqueSuffix()}`;
    const processLabel = `pr-s-${uniqueSuffix()}`;

    await addElectiveShortcutTool.execute({ name: electiveLabel });
    await addProcessShortcutTool.execute({ name: processLabel });
    await page!.waitForSelector(processRowSel(processLabel), { timeout: 10_000 });

    await linkProcessElectiveShortcutTool.execute({
      processLabel,
      electiveLabel,
    });

    const chips = await chipTextOnRow(page!, processLabel);
    expect(chips).toContain(electiveLabel);

    await deleteProcessShortcutTool.execute({ label: processLabel });
    await deleteElectiveShortcutTool.execute({ label: electiveLabel });
  }, 30_000);
});
