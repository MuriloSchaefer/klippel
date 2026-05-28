/**
 * E2E tests for editVisualization + editVisualizationShortcut, including the
 * core regression that changing a bound material's color updates the SVG
 * element through the visualization proxy push.
 */
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';
import { seedMaterialsCatalog } from '@helpers/puppeteer/seedMaterialsCatalog';

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
import { editVisualizationTool } from '@system/modules/Composer/mcpTools/editVisualization';
import { editVisualizationShortcutTool } from '@system/modules/Composer/mcpTools/editVisualizationShortcut';
import { addMaterialTool } from '@system/modules/Composer/mcpTools/addMaterial';
import { editMaterialTool } from '@system/modules/Composer/mcpTools/editMaterial';
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
const BLUE_MATERIAL_LABEL = 'blue-material';
const RED_HEX_RGB = 'rgb(255, 0, 0)';
const BLUE_HEX_RGB = 'rgb(0, 0, 255)';

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
  await addMaterialTool.execute({
    label: BLUE_MATERIAL_LABEL,
    type: 'malha',
    materialId: 3,
  });

  await openGarmentDetailsTool.execute();
};

const readSvgElementFill = async (p: Page, elementId: string) =>
  p.$eval(
    `#svg-editor #${elementId}`,
    (el) => window.getComputedStyle(el).fill,
  );

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-editVisualization');
  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await seedMaterialsCatalog(page);
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-editVisualization');
});

describe('editVisualization via click (E2E)', () => {
  it('changes the bound material and the SVG element fill follows', async () => {
    await setup();
    await addVisualizationTool.execute({
      name: 'rect-vis',
      materialNodeLabel: RED_MATERIAL_LABEL,
      doms: [{ id: 'rect-border', fill: true }],
    });
    expect(await readSvgElementFill(page!, 'rect-border')).toBe(RED_HEX_RGB);

    await editVisualizationTool.execute({
      label: 'rect-vis',
      materialNodeLabel: BLUE_MATERIAL_LABEL,
    });
    expect(await readSvgElementFill(page!, 'rect-border')).toBe(BLUE_HEX_RGB);
  }, 120_000);

  it('changing the bound material color updates the SVG element (E2E)', async () => {
    await setup();
    await addVisualizationTool.execute({
      name: 'rect-vis',
      materialNodeLabel: RED_MATERIAL_LABEL,
      doms: [{ id: 'rect-border', fill: true }],
    });
    expect(await readSvgElementFill(page!, 'rect-border')).toBe(RED_HEX_RGB);

    // Change the underlying material on the red-material node to blue.
    await editMaterialTool.execute({
      label: RED_MATERIAL_LABEL,
      type: 'malha',
      materialId: 3,
    });
    expect(await readSvgElementFill(page!, 'rect-border')).toBe(BLUE_HEX_RGB);
  }, 120_000);
});

describe('editVisualization via shortcut (E2E)', () => {
  it('changes the bound material via keyboard', async () => {
    await setup();
    await addVisualizationTool.execute({
      name: 'circle-vis',
      materialNodeLabel: RED_MATERIAL_LABEL,
      doms: [{ id: 'circle-1', fill: true }],
    });
    expect(await readSvgElementFill(page!, 'circle-1')).toBe(RED_HEX_RGB);

    await editVisualizationShortcutTool.execute({
      label: 'circle-vis',
      materialNodeLabel: BLUE_MATERIAL_LABEL,
    });
    expect(await readSvgElementFill(page!, 'circle-1')).toBe(BLUE_HEX_RGB);
  }, 120_000);
});
