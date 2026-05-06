/**
 * E2E test for the addMaterialShortcut MCP tool.
 *
 * Drives the real `addMaterialShortcutTool.execute` against a running dev
 * Electron (started with `--remote-debugging-port=9222`). Skips if CDP is
 * unreachable. The shortcut variant is keyboard-only — it must reach every
 * field via Tab and confirm via Ctrl+Enter without any DOM clicks.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '../../../testUtils/resetWorkspace';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}. Start it with \`yarn dev\`.`);
    return page;
  },
}));

import { addMaterialShortcutTool } from './addMaterialShortcut';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';
import { createModelTool } from './createModel';
import { openModelTool } from './openModel';
import { switchRibbonTabTool } from '../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const labelToNodeId = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const deleteMaterialIfExists = async (label: string) => {
  if (!page) return;
  await ensureSettingsPanelExpanded(page);
  await expandAccordion(page, 'Materiais');
  const nodeId = labelToNodeId(label);
  const clicked = await page.evaluate((id: string) => {
    const li = document.getElementById(id);
    if (!li) return false;
    const icon = li.querySelector('[data-testid="DeleteOutlineSharpIcon"]');
    const btn = icon?.closest('button') as HTMLButtonElement | null;
    if (!btn) return false;
    btn.click();
    return true;
  }, nodeId);
  if (!clicked) return;
  await page.waitForFunction((id: string) => !document.getElementById(id), { timeout: 5_000 }, nodeId);
};

describe('addMaterialShortcut (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
    await resetWorkspace(page, 'e2e-addMaterialShortcut', 'empty');

    await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
    await switchRibbonTabTool.execute({ label: 'Compositor' });
    await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

    const id = `e2e-${uniqueSuffix()}`;
    const name = `E2E ${id}`;
    await createModelTool.execute({ name, id });
    await page.waitForFunction(
      () => !document.querySelector('[role="pointer-panel-content"] #name'),
      { timeout: 10_000 },
    );
    await openModelTool.execute({ modelName: name });
  }, 45_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
    cleanupWorkspace('e2e-addMaterialShortcut');
  });

  it('opens the panel when called with no arguments', async () => {
    const result = await addMaterialShortcutTool.execute();
    expect(JSON.parse(result.content[0].text)).toMatchObject({ success: true, opened: true });
    await page!.waitForSelector('[role="pointer-panel-content"] [data-testid="add-material-form"]');
    await page!.keyboard.press('Escape');
  }, 30_000);

  it('adds a material node by id via the keyboard path', async () => {
    const label = 'Malha colegial (shortcut)';
    await deleteMaterialIfExists(label);
    await addMaterialShortcutTool.execute({
      label,
      type: 'malha',
      materialId: 6,
    });
    await page!.waitForSelector('li[id="malha-colegial-(shortcut)"]', { timeout: 10_000 });
  }, 30_000);

  it('adds a material node by principal/extra labels via the keyboard path', async () => {
    const label = 'Malha PV (shortcut)';
    await deleteMaterialIfExists(label);
    await addMaterialShortcutTool.execute({
      label,
      type: 'malha',
      material: 'malha pv',
      extra: 'branco',
    });
    await page!.waitForSelector('li[id="malha-pv-(shortcut)"]', { timeout: 10_000 });
  }, 30_000);

  it('rejects when label is provided without type', async () => {
    await expect(
      addMaterialShortcutTool.execute({ label: 'broken' } as any),
    ).rejects.toThrow(/type/i);
  }, 10_000);
});
