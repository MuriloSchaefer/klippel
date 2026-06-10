/**
 * E2E tests for logo cost computation.
 *
 * Cost is evaluated per placement over { colors, width, height, methodFactor,
 * gradesTotal } and summed. These tests assert:
 *   - the row cost equals the SUM of per-placement costs (two placements of
 *     different physical sizes), and the audit lists each placement;
 *   - changing one placement's physical size changes only that contribution
 *     (and the total);
 *   - methodFactor scales the cost (embroidery=1 vs silkscreen=0.6).
 *
 * Cost recompute runs through the debounced computation middleware, so the
 * assertions wait on the row cost caption.
 *
 * Deferred (need extra drivers): gradesTotal tracking (graduation-amount edit)
 * and "visual scale never re-costs" (svgtoolbox drag).
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
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import {
  addPlacement,
  openLogoPlacements,
  resizePlacement,
  setPlacementCostExpression,
} from '@system/modules/Composer/components/viewports/LogoListAccordion/drivers/LogoPlacementsButton.click.puppeteer';
import { openLogoCostAudit } from '@system/modules/Composer/components/viewports/LogoListAccordion/drivers/LogoItem.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');
const LOGO_FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/logo-sample.svg');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const costSelector = (label: string) =>
  `[data-testid="logo-item"][data-logo-label="${label}"] [data-testid="logo-item-cost"]`;

// Wait until the row cost caption ("Custo: N.NN") is within tol of `expected`.
const waitForRowCost = (page: Page, label: string, expected: number, tol = 0.5) =>
  page.waitForFunction(
    (sel: string, exp: number, t: number) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const m = (el.textContent ?? '').match(/Custo:\s*([\d.]+)/);
      return !!m && Math.abs(Number(m[1]) - exp) <= t;
    },
    {},
    costSelector(label),
    expected,
    tol,
  );

const setupModelWithSvg = async () => {
  const id = `e2e-cost-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await page!.waitForSelector('[role="pointer-panel-content"] #name', { hidden: true });
  await openModelTool.execute({ modelName: name });
  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector('[data-testid="svg-empty-state"]');
  await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
  await page!.waitForSelector('#svg-editor');
  return { id, name };
};

// Add a placement sized w x h (cm) at `index` within the open placements pointer.
// Pricing is per placement, so the cost expression is set here too.
const addSizedPlacement = async (
  index: number,
  w: number,
  h: number,
  costExpression: string,
) => {
  await addPlacement(page!);
  await resizePlacement(page!, index, 'width', w);
  await resizePlacement(page!, index, 'height', h);
  await setPlacementCostExpression(page!, index, costExpression);
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-logoCost');

  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-logoCost');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('logo cost (E2E)', () => {
  it('sums per-placement costs and tracks a physical-size change', async () => {
    await setupModelWithSvg();
    const logoLabel = 'cost-sum';
    // Expression independent of method/colors so size drives cost directly.
    await addLogoTool.execute({
      name: logoLabel,
      method: 'embroidery',
      sourceFixturePath: LOGO_FIXTURE_PATH,
    });
    await page!.waitForSelector(`[data-testid="logo-item"][data-logo-label="${logoLabel}"]`);

    await openLogoPlacements(page!, logoLabel);
    await addSizedPlacement(0, 10, 10, 'width * height'); // 100
    await addSizedPlacement(1, 5, 4, 'width * height'); // 20
    await waitForRowCost(page!, logoLabel, 120);

    // Audit lists both placements + a total.
    await resetUIState(page!);
    await openLogoCostAudit(page!, logoLabel);
    const auditPlacements = await page!.$$eval(
      '[role="pointer-panel-content"] [data-testid="logo-cost-audit-placement"]',
      (els) => els.length,
    );
    expect(auditPlacements).toBe(2);
    await page!.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-cost-audit-total"]');
    await resetUIState(page!);

    // Shrink the first placement → only its contribution (and the total) changes.
    await openLogoPlacements(page!, logoLabel);
    await resizePlacement(page!, 0, 'width', 6);
    await resizePlacement(page!, 0, 'height', 6); // 36
    await waitForRowCost(page!, logoLabel, 56); // 36 + 20
  }, 120_000);

  it('scales cost by methodFactor (embroidery=1 vs silkscreen=0.6)', async () => {
    await setupModelWithSvg();

    const embLabel = 'cost-emb';
    const silkLabel = 'cost-silk';
    for (const [label, method] of [
      [embLabel, 'embroidery'],
      [silkLabel, 'silkscreen'],
    ] as const) {
      await addLogoTool.execute({
        name: label,
        method,
        sourceFixturePath: LOGO_FIXTURE_PATH,
      });
      await page!.waitForSelector(`[data-testid="logo-item"][data-logo-label="${label}"]`);
      await openLogoPlacements(page!, label);
      await addSizedPlacement(0, 10, 10, 'width * height * methodFactor');
      await resetUIState(page!);
    }

    await waitForRowCost(page!, embLabel, 100); // 10*10*1
    await waitForRowCost(page!, silkLabel, 60); // 10*10*0.6
  }, 120_000);
});
