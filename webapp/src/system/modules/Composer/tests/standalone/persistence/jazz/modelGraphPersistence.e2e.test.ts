/**
 * E2E coverage for the Jazz-backed graph persistence path. Each `it` block:
 *
 *   1. Creates a fresh model.
 *   2. Adds the node under test (material / elective / process / visualization).
 *   3. Saves with a commit message (writes `graphJson` to the ModelCoMap).
 *   4. Closes the viewport.
 *   5. Reopens the model.
 *   6. Asserts the row reappears in its accordion — proving the graph
 *      survived the round-trip through `jazz.sqlite`.
 *
 * Visualizations also exercise the BinaryCoStream SVG path because they need
 * a backing SVG before they can bind a DOM element.
 *
 * Skips if CDP is unreachable.
 */
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';
import { closeOpenOverlays } from '@helpers/puppeteer/closeOverlays';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { addMaterialTool } from '@system/modules/Composer/mcpTools/addMaterial';
import { addElectiveTool } from '@system/modules/Composer/mcpTools/addElective';
import { addProcessTool } from '@system/modules/Composer/mcpTools/addProcess';
import { addVisualizationTool } from '@system/modules/Composer/mcpTools/addVisualization';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import { closeViewportTool } from '@kernel/modules/Layout/mcpTools/closeViewport';
import {
  openPointerPanel,
  confirmPointerPanel,
} from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, '../../../fixtures/sample.svg');
const TEST_WORKSPACE = 'e2e-modelGraphPersistence';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForCreateFormClosed = async (p: Page) => {
  await p.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
};

const createAndOpenFreshModel = async (label: string) => {
  const id = `e2e-${uniqueSuffix()}`;
  const name = `${label} ${id}`;
  await createModelTool.execute({ name, id });
  await waitForCreateFormClosed(page!);
  await openModelTool.execute({ modelName: name });
  await openGarmentDetailsTool.execute();
  return { id, name };
};

const saveWithMessage = async (message: string) => {
  await openPointerPanel(page!, '#composer-save-model', 'save-model-form');
  await page!.type(
    '[data-testid="save-model-form"] [data-testid="save-model-message"] textarea:not([readonly])',
    message,
  );
  await confirmPointerPanel(page!);
};

const closeAndReopen = async (modelName: string) => {
  await closeViewportTool.execute();
  // Wait until the viewport is gone — `#composer-active-view` is the wrapper
  // owned by the open model viewport and only appears while a viewport exists.
  await page!.waitForSelector('#composer-active-view', { hidden: true, timeout: 10_000 });
  await openModelTool.execute({ modelName });
  await openGarmentDetailsTool.execute();
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, TEST_WORKSPACE);

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
}, 60_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(TEST_WORKSPACE);
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('Model graph persists across viewport close + reopen', () => {
  it('material node survives close + reopen', async () => {
    const { name } = await createAndOpenFreshModel('PersistMat');
    const label = `mat-${uniqueSuffix()}`;
    await addMaterialTool.execute({ label, type: 'malha', materialId: 1 });
    const rowSel = `li[id="${label}"]`;
    await page!.waitForSelector(rowSel, { timeout: 10_000 });

    await saveWithMessage('add material');
    await closeAndReopen(name);

    await page!.waitForSelector(rowSel, { timeout: 15_000 });
  }, 120_000);

  it('elective node survives close + reopen', async () => {
    const { name } = await createAndOpenFreshModel('PersistEl');
    const label = `el-${uniqueSuffix()}`;
    await addElectiveTool.execute({ name: label, isDefault: true });
    const rowSel = `[data-testid="elective-item"][data-elective-label="${label}"]`;
    await page!.waitForSelector(rowSel, { timeout: 10_000 });

    await saveWithMessage('add elective');
    await closeAndReopen(name);

    await page!.waitForSelector(rowSel, { timeout: 15_000 });
    // `isDefault: true` is encoded as text — check it round-tripped too.
    const rowText = await page!.$eval(rowSel, (el) => (el as HTMLElement).innerText);
    expect(rowText).toContain('padrão: sim');
  }, 120_000);

  it('process node survives close + reopen', async () => {
    const { name } = await createAndOpenFreshModel('PersistProc');
    const label = `pr-${uniqueSuffix()}`;
    await addProcessTool.execute({
      name: label,
      costTime: { quotientAmount: 2, dividendAmount: 5 },
      costMoney: { quotientAmount: 10 },
    });
    const rowSel = `[data-testid="process-item"][data-process-label="${label}"]`;
    await page!.waitForSelector(rowSel, { timeout: 10_000 });

    await saveWithMessage('add process');
    await closeAndReopen(name);

    await page!.waitForSelector(rowSel, { timeout: 15_000 });
    // The numeric cost fields are part of the ProcessNode payload — assert
    // they survived the JSON round-trip through `graphJson`.
    const rowText = await page!.$eval(rowSel, (el) => (el as HTMLElement).innerText);
    expect(rowText).toContain('2');
    expect(rowText).toContain('5');
    expect(rowText).toContain('10');
  }, 120_000);

  it('visualization node survives close + reopen', async () => {
    const { name } = await createAndOpenFreshModel('PersistVis');

    // Visualizations need an SVG + a material to bind to.
    await switchViewTool.execute({ view: 'svg' });
    await page!.waitForSelector('[data-testid="svg-empty-state"]', { timeout: 10_000 });
    await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
    await page!.waitForSelector('#svg-editor', { timeout: 10_000 });

    const matLabel = `mat-${uniqueSuffix()}`;
    await addMaterialTool.execute({ label: matLabel, type: 'malha', materialId: 5 });
    await openGarmentDetailsTool.execute();

    const visLabel = `vis-${uniqueSuffix()}`;
    await addVisualizationTool.execute({
      name: visLabel,
      materialNodeLabel: matLabel,
      doms: [{ id: 'rect-border', fill: true, stroke: false }],
    });
    const rowSel = `[data-testid="visualization-item"][data-visualization-label="${visLabel}"]`;
    await page!.waitForSelector(rowSel, { timeout: 10_000 });

    await saveWithMessage('add visualization');
    await closeAndReopen(name);

    await page!.waitForSelector(rowSel, { timeout: 15_000 });
    // The bound material reference should still resolve — material row
    // present in its accordion proves the edge survived.
    await page!.waitForSelector(`li[id="${matLabel}"]`, { timeout: 10_000 });
  }, 180_000);
});
