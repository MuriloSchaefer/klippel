/**
 * E2E tests for the addMaterial functionality.
 *
 * Covers both entry points against a running dev Electron
 * (started with `--remote-debugging-port=9222`):
 *   - `addMaterialTool.execute` (click/pointer path)
 *   - `addMaterialShortcutTool.execute` (keyboard-only path)
 *
 * Per mcp-server.md, this test is owned by the module — not by a top-level
 * harness — and must drive the tools themselves, not re-implement the form flow.
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

import { addMaterialTool } from './addMaterial';
import { addMaterialShortcutTool } from './addMaterialShortcut';
import { deleteMaterialTool } from './deleteMaterial';
import { deleteMaterialShortcutTool } from './deleteMaterialShortcut';
import { createModelTool } from './createModel';
import { openModelTool } from './openModel';
import { switchRibbonTabTool } from '../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const labelToNodeId = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

const waitForFormClosed = async (p: Page) => {
  await p.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"] #name'),
    { timeout: 10_000 },
  );
};

const closeAllOpenContainers = async (p: Page) => {
  for (let i = 0; i < 5; i++) {
    const hasOpen = await p.evaluate(
      () =>
        Boolean(
          document.querySelector('[role="pointer-panel"]') ||
            document.querySelector('[role="pointer-panel-content"]') ||
            document.querySelector('[role="list-options"]') ||
            document.querySelector('ul[role="listbox"]'),
        ),
    );
    if (!hasOpen) return;
    await p.keyboard.press('Escape');
    await p
      .waitForFunction(
        () =>
          !document.querySelector('[role="pointer-panel"]') &&
          !document.querySelector('[role="pointer-panel-content"]') &&
          !document.querySelector('[role="list-options"]') &&
          !document.querySelector('ul[role="listbox"]'),
        { timeout: 500 },
      )
      .catch(() => {});
  }
};

const deleteMaterialIfExists = async (
  label: string,
  tool: { execute: (input: { label: string }) => Promise<unknown> },
) => {
  if (!page) return;
  await ensureSettingsPanelExpanded(page);
  await expandAccordion(page, 'Materiais');
  const nodeId = labelToNodeId(label);
  const exists = await page.$(`li[id="${nodeId}"]`);
  if (!exists) return;
  await tool.execute({ label });
  await page.waitForFunction((id: string) => !document.getElementById(id), { timeout: 5_000 }, nodeId);
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-addMaterial', 'empty');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E AddMaterial ${id}`;
  await createModelTool.execute({ name, id });
  await waitForFormClosed(page);
  await openModelTool.execute({ modelName: name });
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-addMaterial');
});

beforeEach(async () => {
  if (page) {
    await closeAllOpenContainers(page);
  }
}, 15_000);

describe('addMaterial via click (E2E)', () => {
  it('adds a material node by id', async () => {
    const label = 'Malha PV (test)';
    await deleteMaterialIfExists(label, deleteMaterialTool);
    await addMaterialTool.execute({
      label,
      type: 'malha',
      materialId: 1,
    });
    await page!.waitForSelector('li[id="malha-pv-(test)"]', { timeout: 10_000 });
  }, 30_000);

  it('adds a material node by principal/extra labels', async () => {
    const label = 'Tricoline Off White (extra)';
    await deleteMaterialIfExists(label, deleteMaterialTool);
    await addMaterialTool.execute({
      label,
      type: 'tecido',
      material: 'tricoline',
      extra: 'off white',
    });
    await page!.waitForSelector('li[id="tricoline-off-white-(extra)"]', { timeout: 10_000 });
  }, 30_000);

  it('rejects when neither materialId nor material is provided', async () => {
    await expect(
      addMaterialTool.execute({ label: 'broken', type: 'malha' } as any),
    ).rejects.toThrow(/material/i);
  }, 30_000);
});

describe('addMaterial via shortcut (E2E)', () => {
  it('opens the panel when called with no arguments', async () => {
    const result = await addMaterialShortcutTool.execute();
    expect(JSON.parse(result.content[0].text)).toMatchObject({ success: true, opened: true });
    await page!.waitForSelector('[role="pointer-panel-content"] [data-testid="add-material-form"]');
    await page!.keyboard.press('Escape');
  }, 30_000);

  it('adds a material node by id via the keyboard path', async () => {
    const label = 'Malha colegial (shortcut)';
    await deleteMaterialIfExists(label, deleteMaterialShortcutTool);
    await addMaterialShortcutTool.execute({
      label,
      type: 'malha',
      materialId: 6,
    });
    await page!.waitForSelector('li[id="malha-colegial-(shortcut)"]', { timeout: 10_000 });
  }, 30_000);

  it('adds a material node by principal/extra labels via the keyboard path', async () => {
    const label = 'Malha PV (shortcut)';
    await deleteMaterialIfExists(label, deleteMaterialShortcutTool);
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
