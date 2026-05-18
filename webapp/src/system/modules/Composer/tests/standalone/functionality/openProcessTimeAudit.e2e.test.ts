/**
 * E2E tests for openProcessTimeAudit + openProcessTimeAuditShortcut. Skips if CDP unreachable.
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

import { addProcessTool } from '@system/modules/Composer/mcpTools/addProcess';
import { addProcessShortcutTool } from '@system/modules/Composer/mcpTools/addProcessShortcut';
import { deleteProcessTool } from '@system/modules/Composer/mcpTools/deleteProcess';
import { deleteProcessShortcutTool } from '@system/modules/Composer/mcpTools/deleteProcessShortcut';
import { openProcessTimeAuditTool } from '@system/modules/Composer/mcpTools/openProcessTimeAudit';
import { openProcessTimeAuditShortcutTool } from '@system/modules/Composer/mcpTools/openProcessTimeAuditShortcut';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-process-time-audit');

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
  cleanupWorkspace('e2e-process-time-audit');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('openProcessTimeAudit via click (E2E)', () => {
  it('opens the time audit panel and reports the converted result', async () => {
    const processLabel = `prT-c-${uniqueSuffix()}`;

    try {
      await addProcessTool.execute({ name: processLabel });

      const result = await openProcessTimeAuditTool.execute({ processLabel });
      const payload = JSON.parse(result.content[0].text);
      expect(payload.success).toBe(true);
      expect(payload.auditText).toContain('Auditoria de Tempo');
      expect(payload.auditText).toContain(processLabel);
      // Default costTime (1 un / 1 min) converts to 1 min/un.
      expect(payload.auditText).toMatch(/Tempo por unidade/);
    } finally {
      await closeOpenOverlays(page!);
      await deleteProcessTool.execute({ label: processLabel }).catch(() => {});
    }
  }, 45_000);
});

describe('openProcessTimeAudit via shortcut (E2E)', () => {
  it('opens the time audit panel via keyboard and reports the converted result', async () => {
    const processLabel = `prT-s-${uniqueSuffix()}`;

    try {
      await addProcessShortcutTool.execute({ name: processLabel });

      const result = await openProcessTimeAuditShortcutTool.execute({
        processLabel,
      });
      const payload = JSON.parse(result.content[0].text);
      expect(payload.success).toBe(true);
      expect(payload.auditText).toContain('Auditoria de Tempo');
      expect(payload.auditText).toContain(processLabel);
      expect(payload.auditText).toMatch(/Tempo por unidade/);
    } finally {
      await closeOpenOverlays(page!);
      await deleteProcessShortcutTool.execute({ label: processLabel }).catch(() => {});
    }
  }, 45_000);
});
