/**
 * E2E tests for spatial manipulation of a logo placement via the svgtoolbox:
 * moving (drag), scaling (corner handle), and clipping (pick a target element).
 *
 * Each test selects the placement into the toolbox, drives the real handles /
 * clip pick with pointer input, and asserts the effect lands on the placement's
 * <use> in the editor SVG:
 *   - move  → the transform translate changes
 *   - scale → the transform scale grows
 *   - clip  → a <clipPath> referencing the target is injected and the placement
 *             wrapper gets clip-path="url(#logo-clip-…)"
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

import { addLogoTool } from '@system/modules/Composer/mcpTools/addLogo';
import { addLogoPlacementTool } from '@system/modules/Composer/mcpTools/addLogoPlacement';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import {
  clipSelectedPlacementInto,
  dragManipHandle,
  readPlacementTransform,
  selectFirstPlacementForManipulation,
  waitForPlacementTransform,
} from '@system/modules/Composer/components/viewports/LogoListAccordion/drivers/LogoManipulation.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');
const LOGO_FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/logo-sample.svg');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const setupSelectedPlacement = async (logoLabel: string) => {
  const id = `e2e-manip-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await page!.waitForSelector('[role="pointer-panel-content"] #name', { hidden: true });
  await openModelTool.execute({ modelName: name });
  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector('[data-testid="svg-empty-state"]');
  await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
  await page!.waitForSelector('#svg-editor');

  await addLogoTool.execute({
    name: logoLabel,
    method: 'embroidery',
    sourceFixturePath: LOGO_FIXTURE_PATH,
  });
  await page!.waitForSelector(`[data-testid="logo-item"][data-logo-label="${logoLabel}"]`);
  await addLogoPlacementTool.execute({ logoLabel });
  await page!.waitForSelector('#svg-editor use[id^="logo-"]');
  // addLogoPlacement leaves the placements pointer open; close it before the
  // manipulation driver re-opens it.
  await resetUIState(page!);
  await selectFirstPlacementForManipulation(page!, logoLabel);
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-placementManipulation');

  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-placementManipulation');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('placement manipulation via svgtoolbox (E2E)', () => {
  it('moves a placement by dragging it in the editor', async () => {
    await setupSelectedPlacement('manip-move');
    const before = await readPlacementTransform(page!);
    await dragManipHandle(page!, 'move', 70, 70);
    await waitForPlacementTransform(page!, 'x', 'increased', before.x);
    const after = await readPlacementTransform(page!);
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.y).toBeGreaterThan(before.y);
  }, 90_000);

  it('scales a placement by dragging the corner handle', async () => {
    await setupSelectedPlacement('manip-scale');
    const before = await readPlacementTransform(page!);
    await dragManipHandle(page!, 'scale', 60, 60);
    await waitForPlacementTransform(page!, 'scale', 'increased', before.scale);
    const after = await readPlacementTransform(page!);
    expect(after.scale).toBeGreaterThan(before.scale);
  }, 90_000);

  it('clips a placement into another SVG element', async () => {
    await setupSelectedPlacement('manip-clip');
    // circle-2 sits at (140,60) — outside the placement's 0–100 box, so it is
    // not under the (transparent) move handle.
    await clipSelectedPlacementInto(page!, 'circle-2');

    // A clipPath is injected, referencing the picked target.
    await page!.waitForSelector('#svg-editor [id^="logo-clip-"]');
    const clipRefsTarget = await page!.$eval(
      '#svg-editor [id^="logo-clip-"] use',
      (el) =>
        el.getAttribute('href') === '#circle-2' ||
        el.getAttribute('xlink:href') === '#circle-2',
    );
    expect(clipRefsTarget).toBe(true);

    // The placement wrapper carries the clip-path attribute.
    await page!.waitForSelector('#svg-editor [id^="logo-clipwrap-"][clip-path]');
    const clipPathAttr = await page!.$eval(
      '#svg-editor [id^="logo-clipwrap-"][clip-path]',
      (el) => el.getAttribute('clip-path') ?? '',
    );
    expect(clipPathAttr).toMatch(/^url\(#logo-clip-/);
  }, 90_000);
});
