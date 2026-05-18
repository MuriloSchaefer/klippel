/**
 * E2E tests for deleteVisualization + deleteVisualizationShortcut.
 *
 * Per CLAUDE.md change spec: every visualization test uploads the sample SVG
 * and adds a material before exercising the tool.
 */
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';

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

import { addVisualizationTool } from '@system/modules/Composer/mcpTools/addVisualization';
import { deleteVisualizationTool } from '@system/modules/Composer/mcpTools/deleteVisualization';
import { deleteVisualizationShortcutTool } from '@system/modules/Composer/mcpTools/deleteVisualizationShortcut';
import { addMaterialTool } from '@system/modules/Composer/mcpTools/addMaterial';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForFormClosed = async (p: Page) => {
  await p.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
};

const RED_MATERIAL_LABEL = 'red-material';

const setup = async () => {
  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await waitForFormClosed(page!);
  await openModelTool.execute({ modelName: name });

  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector('[data-testid="svg-empty-state"]', { timeout: 10_000 });
  await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
  await page!.waitForSelector('#svg-editor', { timeout: 10_000 });

  await addMaterialTool.execute({
    label: RED_MATERIAL_LABEL,
    type: 'malha',
    materialId: 5,
  });

  await openGarmentDetailsTool.execute();
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-deleteVisualization');
  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-deleteVisualization');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('deleteVisualization via click (E2E)', () => {
  it('deletes the visualization and the row disappears', async () => {
    await setup();
    await addVisualizationTool.execute({
      name: 'rect-vis',
      materialNodeLabel: RED_MATERIAL_LABEL,
      doms: [{ id: 'rect-border', fill: true }],
    });
    await page!.waitForSelector(
      '[data-testid="visualization-item"][data-visualization-label="rect-vis"]',
    );
    await deleteVisualizationTool.execute({ label: 'rect-vis' });
    await page!.waitForSelector(
      '[data-testid="visualization-item"][data-visualization-label="rect-vis"]',
      { hidden: true, timeout: 5_000 },
    );
  }, 90_000);
});

describe('deleteVisualization via shortcut (E2E)', () => {
  it('deletes the visualization via the "d" shortcut on the focused row', async () => {
    await setup();
    await addVisualizationTool.execute({
      name: 'circle-vis',
      materialNodeLabel: RED_MATERIAL_LABEL,
      doms: [{ id: 'circle-1', fill: true }],
    });
    await page!.waitForSelector(
      '[data-testid="visualization-item"][data-visualization-label="circle-vis"]',
    );
    await deleteVisualizationShortcutTool.execute({ label: 'circle-vis' });
    await page!.waitForSelector(
      '[data-testid="visualization-item"][data-visualization-label="circle-vis"]',
      { hidden: true, timeout: 5_000 },
    );
  }, 90_000);
});
