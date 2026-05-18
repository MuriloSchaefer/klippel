/**
 * E2E tests for the openModel functionality (click + shortcut).
 * Skips when CDP is unreachable.
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

import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { createModelShortcutTool } from '@system/modules/Composer/mcpTools/createModelShortcut';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { openModelShortcutTool } from '@system/modules/Composer/mcpTools/openModelShortcut';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForFormClosed = async (p: Page) => {
  await p.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
};

const closeOpenModelModal = async (p: Page) => {
  await p.keyboard.press('Escape');
  await p
    .waitForSelector('[role="list-options"]', { hidden: true, timeout: 5_000 })
    .catch(() => {});
};
const expectSelectedTab = async (p: Page, name: string) => {
  // Poll the selected tab's text content; can't be expressed as a single
  // selector since we need substring-match against textContent.
  const start = Date.now();
  while (Date.now() - start < 10_000) {
    const found = await p.$$eval(
      '[role="viewport-tabs"] [aria-selected="true"]',
      (els, target) => els.some((e) => (e.textContent ?? '').includes(target)),
      name,
    );
    if (found) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`expectSelectedTab: tab containing "${name}" not selected within 10s`);
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-openModel');
  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 20_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
}, 30_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-openModel');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('openModel via click (E2E)', () => {
  it('opens a previously created model in a new viewport tab', async () => {
    const id = `e2e-open-${uniqueSuffix()}`;
    const name = `E2E Open ${id}`;
    await createModelTool.execute({ name, id });
    await waitForFormClosed(page!);

    const result = await openModelTool.execute({ modelName: name });
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });

    await expectSelectedTab(page!, name);
  }, 30_000);

  it('rejects when the model name does not exist', async () => {
    await expect(
      openModelTool.execute({ modelName: `nonexistent-${uniqueSuffix()}` }),
    ).rejects.toThrow(/not found/);
    await closeOpenModelModal(page!);
  }, 20_000);
});

describe('openModel via shortcut (E2E)', () => {
  it('opens the selection modal when called with no arguments', async () => {
    const result = await openModelShortcutTool.execute();
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true, opened: true });
    await page!.waitForSelector('[role="list-options"]', { timeout: 5_000 });
    await closeOpenModelModal(page!);
  }, 15_000);

  it('opens a previously created model in a new viewport tab via the keyboard path', async () => {
    const id = `e2e-${uniqueSuffix()}`;
    const name = `E2E OpenShortcut ${id}`;
    await createModelShortcutTool.execute({ name, id });
    await waitForFormClosed(page!);

    const result = await openModelShortcutTool.execute({ modelName: name });
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true, modelName: name });

    await expectSelectedTab(page!, name);
  }, 30_000);

  it('rejects when the model name does not exist', async () => {
    await expect(
      openModelShortcutTool.execute({ modelName: `nonexistent-${uniqueSuffix()}` }),
    ).rejects.toThrow(/not found/);
    await closeOpenModelModal(page!);
  }, 20_000);
});
