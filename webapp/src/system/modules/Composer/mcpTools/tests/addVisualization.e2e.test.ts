/**
 * E2E tests for addVisualization + addVisualizationShortcut.
 *
 * Each test:
 *   - creates a model
 *   - uploads the shared sample.svg fixture
 *   - adds a material (so visualizations have something to bind to)
 *   - opens garment details
 *   - exercises the visualization tool
 *   - asserts the bound SVG element's fill/stroke follows the material color
 */
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { addVisualizationTool } from '../addVisualization';
import { addVisualizationShortcutTool } from '../addVisualizationShortcut';
import { addMaterialTool } from '../addMaterial';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchViewTool } from '../switchView';
import { uploadVariationSVGTool } from '../uploadVariationSVG';
import { openGarmentDetailsTool } from '../openGarmentDetails';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const FIXTURE_PATH = path.resolve(__dirname, 'fixtures/sample.svg');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForFormClosed = async (p: Page) => {
  await p.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
};

const RED_MATERIAL_LABEL = 'red-material';
const BLUE_MATERIAL_LABEL = 'blue-material';
const RED_HEX_RGB = 'rgb(255, 0, 0)'; // material id 5 → #ff0000
const BLUE_HEX_RGB = 'rgb(0, 0, 255)'; // material id 3 → #0000ff

const setupModelWithSvgAndMaterials = async () => {
  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await waitForFormClosed(page!);
  await openModelTool.execute({ modelName: name });

  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector('[data-testid="svg-empty-state"]', {
    timeout: 10_000,
  });
  await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
  await page!.waitForSelector('#svg-editor', { timeout: 10_000 });

  await addMaterialTool.execute({
    label: RED_MATERIAL_LABEL,
    type: 'malha',
    materialId: 5,
  });
  await addMaterialTool.execute({
    label: BLUE_MATERIAL_LABEL,
    type: 'malha',
    materialId: 3,
  });

  await openGarmentDetailsTool.execute();
  return { id, name };
};

const readSvgElementFill = async (p: Page, elementId: string) =>
  p.$eval(
    `#svg-editor #${elementId}`,
    (el) => window.getComputedStyle(el).fill,
  );

const readSvgElementStroke = async (p: Page, elementId: string) =>
  p.$eval(
    `#svg-editor #${elementId}`,
    (el) => window.getComputedStyle(el).stroke,
  );

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-addVisualization');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-addVisualization');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('addVisualization via click (E2E)', () => {
  it('adds a visualization and the bound SVG element takes the material color', async () => {
    await setupModelWithSvgAndMaterials();
    await addVisualizationTool.execute({
      name: 'red-rect',
      materialNodeLabel: RED_MATERIAL_LABEL,
      doms: [{ id: 'rect-border', fill: true, stroke: false }],
    });
    await page!.waitForSelector(
      '[data-testid="visualization-item"][data-visualization-label="red-rect"]',
      { timeout: 10_000 },
    );
    const fill = await readSvgElementFill(page!, 'rect-border');
    expect(fill).toBe(RED_HEX_RGB);
  }, 90_000);

  it('binds two elements with different fill/stroke settings in one visualization', async () => {
    await setupModelWithSvgAndMaterials();
    await addVisualizationTool.execute({
      name: 'mixed-vis',
      materialNodeLabel: RED_MATERIAL_LABEL,
      doms: [
        { id: 'rect-border', fill: true, stroke: false },
        { id: 'circle-1', fill: false, stroke: true },
      ],
    });
    expect(await readSvgElementFill(page!, 'rect-border')).toBe(RED_HEX_RGB);
    expect(await readSvgElementStroke(page!, 'circle-1')).toBe(RED_HEX_RGB);
  }, 90_000);

  it('rejects empty doms array', async () => {
    await expect(
      addVisualizationTool.execute({
        name: 'invalid',
        materialNodeLabel: RED_MATERIAL_LABEL,
        doms: [],
      }),
    ).rejects.toThrow(/dom/);
  });
});

describe('addVisualization via shortcut (E2E)', () => {
  it('adds a visualization via keyboard and the bound SVG element takes the material color', async () => {
    await setupModelWithSvgAndMaterials();
    await addVisualizationShortcutTool.execute({
      name: 'blue-circle',
      materialNodeLabel: BLUE_MATERIAL_LABEL,
      doms: [{ id: 'circle-1', fill: true, stroke: false }],
    });
    await page!.waitForSelector(
      '[data-testid="visualization-item"][data-visualization-label="blue-circle"]',
      { timeout: 10_000 },
    );
    const fill = await readSvgElementFill(page!, 'circle-1');
    expect(fill).toBe(BLUE_HEX_RGB);
  }, 90_000);
});
