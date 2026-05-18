/**
 * E2E tests for focusProcessTimeList + cycleProcessTimeFocus (keyboard-only). Skips if CDP unreachable.
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

import { addProcessShortcutTool } from '@system/modules/Composer/mcpTools/addProcessShortcut';
import { deleteProcessShortcutTool } from '@system/modules/Composer/mcpTools/deleteProcessShortcut';
import { focusProcessTimeListTool } from '@system/modules/Composer/mcpTools/focusProcessTimeList';
import { cycleProcessTimeFocusTool } from '@system/modules/Composer/mcpTools/cycleProcessTimeFocus';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import {
  waitForProcessTimeItem,
  waitForProcessTimeComputed,
} from '@system/modules/Composer/components/viewports/ProcessTimeAccordion/drivers/ProcessTimeItem.click.puppeteer';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-process-time-focus');

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
  cleanupWorkspace('e2e-process-time-focus');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('cycleProcessTimeFocus via shortcut (E2E)', () => {
  it('focusProcessTimeList focuses the first row; ArrowDown/ArrowUp move focus through rows', async () => {
    const a = `prF-a-${uniqueSuffix()}`;
    const b = `prF-b-${uniqueSuffix()}`;
    const c = `prF-c-${uniqueSuffix()}`;

    try {
      await addProcessShortcutTool.execute({ name: a });
      await addProcessShortcutTool.execute({ name: b });
      await addProcessShortcutTool.execute({ name: c });

      // addProcessShortcut only waits for the process *list* row; the
      // process-time row is populated by a debounced middleware and may not
      // be in the DOM yet when ArrowDown navigation starts. Waiting for
      // "computed" status also guarantees the middleware has finished
      // re-rendering the list — rows mutating between keystrokes can shift
      // sibling order under the ArrowDown handler.
      await waitForProcessTimeItem(page!, a);
      await waitForProcessTimeItem(page!, b);
      await waitForProcessTimeItem(page!, c);
      await waitForProcessTimeComputed(page!, a);
      await waitForProcessTimeComputed(page!, b);
      await waitForProcessTimeComputed(page!, c);

      const focusResult = await focusProcessTimeListTool.execute();
      const focusPayload = JSON.parse(focusResult.content[0].text);
      expect(focusPayload.success).toBe(true);
      expect(focusPayload.focused?.type).toBe('process-time-item');
      // First process row should be focused.
      expect(focusPayload.focused?.label).toBe(a);

      const next1 = await cycleProcessTimeFocusTool.execute({ direction: 'next' });
      const next1Payload = JSON.parse(next1.content[0].text);
      expect(next1Payload.focused?.label).toBe(b);

      const next2 = await cycleProcessTimeFocusTool.execute({
        direction: 'next',
        count: 1,
      });
      const next2Payload = JSON.parse(next2.content[0].text);
      expect(next2Payload.focused?.label).toBe(c);

      const back = await cycleProcessTimeFocusTool.execute({
        direction: 'prev',
        count: 2,
      });
      const backPayload = JSON.parse(back.content[0].text);
      expect(backPayload.focused?.label).toBe(a);
    } finally {
      await closeOpenOverlays(page!);
      await deleteProcessShortcutTool.execute({ label: a }).catch(() => {});
      await deleteProcessShortcutTool.execute({ label: b }).catch(() => {});
      await deleteProcessShortcutTool.execute({ label: c }).catch(() => {});
    }
  }, 60_000);
});
