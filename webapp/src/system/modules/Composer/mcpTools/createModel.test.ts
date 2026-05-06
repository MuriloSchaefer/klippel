/**
 * E2E tests for the createModel MCP tool. Skips when CDP is unreachable.
 *
 * Drives the real `createModelTool.execute` against a running Electron and
 * verifies the new model is reachable via the open-model modal.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '../../../testUtils/resetWorkspace';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { createModelTool } from './createModel';
import { switchRibbonTabTool } from '../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForFormClosed = async (p: Page) => {
  await p.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"] #name'),
    { timeout: 10_000 },
  );
};

const modelExistsInOpenModal = async (p: Page, name: string) => {
  await p.click('#open-model-modal');
  await p.waitForSelector('[role="list-options"]', { timeout: 10_000 });
  const found = await p.$$eval(
    '[role="list-options"] [id]',
    (els, target) => els.some((e) => e.getAttribute('id') === target),
    name,
  );
  // Close the modal so subsequent tests start from a clean state.
  await p.keyboard.press('Escape');
  await p.waitForFunction(
    () => !document.querySelector('[role="list-options"]'),
    { timeout: 5_000 },
  ).catch(() => {});
  return found;
};

describe('createModel (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
    await resetWorkspace(page, 'e2e-createModel', 'empty');
    await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
    await switchRibbonTabTool.execute({ label: 'Compositor' });
    await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
  }, 20_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
    cleanupWorkspace('e2e-createModel');
  });

  it('creates a model with an explicit id and name', async () => {
    const id = `e2e-create-${uniqueSuffix()}`;
    const name = `E2E Create ${id}`;
    const result = await createModelTool.execute({ name, id });
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
    await waitForFormClosed(page!);
    const found = await modelExistsInOpenModal(page!, name);
    expect(found).toBe(true);
  }, 30_000);

  it('creates a model without an explicit id (auto-generated)', async () => {
    const name = `E2E Auto ${uniqueSuffix()}`;
    const result = await createModelTool.execute({ name });
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
    await waitForFormClosed(page!);
  }, 30_000);
});
