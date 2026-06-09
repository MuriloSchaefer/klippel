/**
 * E2E tests for addLogoPlacement + addLogoPlacementShortcut.
 *
 * A placement is a copy of the logo that renders as a <use href="#logo-sym-…">
 * inside the editor SVG. These tests assert the copy ACTUALLY appears in
 * #svg-editor (not just that a node/placement entry exists), that renaming it is
 * reflected in the placements pointer, and that deleting it removes the rendered
 * <use>.
 *
 * Spatial move/rotate/scale/clip is interactive (svgtoolbox) and is not covered
 * here.
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
import { addLogoPlacementShortcutTool } from '@system/modules/Composer/mcpTools/addLogoPlacementShortcut';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import {
  addPlacement,
  countPlacementUses,
  deletePlacement,
  openLogoPlacements,
  readPlacementName,
} from '@system/modules/Composer/components/viewports/LogoListAccordion/drivers/LogoPlacementsButton.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');
const LOGO_FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/logo-sample.svg');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const setupModelWithLogo = async (logoLabel: string) => {
  const id = `e2e-place-${uniqueSuffix()}`;
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
  return { id, name };
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-addLogoPlacement');

  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-addLogoPlacement');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('addLogoPlacement via click (E2E)', () => {
  it('adds a named placement that renders as a <use> in the editor SVG', async () => {
    await setupModelWithLogo('place-click');
    await addLogoPlacementTool.execute({
      logoLabel: 'place-click',
      name: 'Manga direita',
    });

    // The copy actually appears in the editor SVG as a <use> of the logo symbol.
    await page!.waitForSelector('#svg-editor use[id^="logo-"]');
    expect(await countPlacementUses(page!)).toBe(1);
    // The new placement carries the requested name (pointer still open).
    expect(await readPlacementName(page!, 0)).toBe('Manga direita');
  }, 90_000);

  it('reflects add/delete in the rendered <use> count', async () => {
    await setupModelWithLogo('place-multi');
    await openLogoPlacements(page!, 'place-multi');

    await addPlacement(page!);
    await addPlacement(page!);
    await page!.waitForFunction(
      (sel: string) => document.querySelectorAll(sel).length === 2,
      {},
      '#svg-editor use[id^="logo-"]',
    );

    await deletePlacement(page!, 0);
    await page!.waitForFunction(
      (sel: string) => document.querySelectorAll(sel).length === 1,
      {},
      '#svg-editor use[id^="logo-"]',
    );
  }, 90_000);
});

describe('addLogoPlacement via shortcut (E2E)', () => {
  it('adds a placement by keyboard that renders in the editor SVG', async () => {
    await setupModelWithLogo('place-shortcut');
    await addLogoPlacementShortcutTool.execute({
      logoLabel: 'place-shortcut',
      name: 'Peito esquerdo',
    });

    await page!.waitForSelector('#svg-editor use[id^="logo-"]');
    expect(await countPlacementUses(page!)).toBe(1);
    expect(await readPlacementName(page!, 0)).toBe('Peito esquerdo');
  }, 90_000);
});
