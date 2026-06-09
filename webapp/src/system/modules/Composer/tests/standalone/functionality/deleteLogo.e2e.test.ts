/**
 * E2E tests for deleteLogo + deleteLogoShortcut.
 *
 * Deleting a logo must remove it from the editor SVG: its source <symbol> and
 * any placement <use> elements disappear from #svg-editor, and the row leaves
 * the Logos list.
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
import { deleteLogoTool } from '@system/modules/Composer/mcpTools/deleteLogo';
import { deleteLogoShortcutTool } from '@system/modules/Composer/mcpTools/deleteLogoShortcut';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');
const LOGO_FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/logo-sample.svg');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const setupModelWithLogoAndPlacement = async (logoLabel: string) => {
  const id = `e2e-del-${uniqueSuffix()}`;
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
  // addLogoPlacement leaves the placements pointer open (no confirm button); drain
  // it so its Modal portal can't intercept the subsequent delete click.
  await resetUIState(page!);
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-deleteLogo');

  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-deleteLogo');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('deleteLogo via click (E2E)', () => {
  it('removes the row, the source symbol, and placement <use> from the editor SVG', async () => {
    await setupModelWithLogoAndPlacement('del-click');
    await deleteLogoTool.execute({ logoLabel: 'del-click' });

    await page!.waitForSelector('[data-testid="logo-item"][data-logo-label="del-click"]', {
      hidden: true,
    });
    await page!.waitForSelector('#svg-editor [id^="logo-sym-"]', { hidden: true });
    await page!.waitForSelector('#svg-editor use[id^="logo-"]', { hidden: true });
  }, 90_000);
});

describe('deleteLogo via shortcut (E2E)', () => {
  it('removes a focused logo with the "d" key', async () => {
    await setupModelWithLogoAndPlacement('del-shortcut');
    await deleteLogoShortcutTool.execute({ logoLabel: 'del-shortcut' });

    await page!.waitForSelector('[data-testid="logo-item"][data-logo-label="del-shortcut"]', {
      hidden: true,
    });
    await page!.waitForSelector('#svg-editor [id^="logo-sym-"]', { hidden: true });
  }, 90_000);
});
