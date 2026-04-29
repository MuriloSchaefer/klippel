/**
 * E2E test for the addMaterial MCP tool.
 *
 * Drives the real `addMaterialTool.execute` against a running dev Electron
 * (started with `--remote-debugging-port=9222`). Skips if CDP is unreachable
 * so it does not fail in unit-test contexts where no Electron is running.
 *
 * Per mcp-server.md, this test is owned by the module — not by a top-level
 * harness — and must drive the tool itself, not re-implement the form flow.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';

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
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';

const labelToNodeId = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

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

describe('addMaterial (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
    const pages = await browser.pages();
    page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
  }, 15_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
  });

  it('adds a material node by id', async () => {
    const label = 'Malha PV (test)';
    await deleteMaterialIfExists(label);
    await addMaterialTool.execute({
      label,
      type: 'malha',
      materialId: 1,
    });
    await page!.waitForSelector('li[id="malha-pv-(test)"]', { timeout: 10_000 });
  }, 30_000);

  it('adds a material node by principal/extra labels', async () => {
    const label = 'Tricoline Off White (extra)';
    await deleteMaterialIfExists(label);
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
