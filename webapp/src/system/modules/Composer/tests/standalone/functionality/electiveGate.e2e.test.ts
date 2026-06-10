/**
 * E2E test for the logo elective gate.
 *
 * A logo linked to an elective contributes no cost while that elective is off:
 * the row cost drops to 0 and the cost audit reports `skipped`. Turning the
 * elective back on restores the computed cost. (The cost recompute runs through
 * the debounced computation middleware, so the assertions wait on the row cost
 * caption rather than asserting synchronously.)
 *
 * Note: hiding the placements from the editor SVG when gated off is not yet
 * implemented (only the cost gate is), so this test asserts the cost behavior.
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
import { linkLogoElectiveTool } from '@system/modules/Composer/mcpTools/linkLogoElective';
import { addElectiveTool } from '@system/modules/Composer/mcpTools/addElective';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import { setElectiveValue } from '@system/modules/Composer/components/viewports/ElectiveListAccordion/drivers/ElectiveItem.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '@system/modules/Composer/components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { openLogoListAccordion } from '@system/modules/Composer/components/viewports/LogoListAccordion/drivers/AddLogoButton.click.puppeteer';
import { openLogoCostAudit } from '@system/modules/Composer/components/viewports/LogoListAccordion/drivers/LogoItem.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');
const LOGO_FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/logo-sample.svg');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const costSelector = (label: string) =>
  `[data-testid="logo-item"][data-logo-label="${label}"] [data-testid="logo-item-cost"]`;

// Wait until the row cost caption ("Custo: N.NN (...)") is positive or zero.
// `want` is passed as a primitive (not a serialized function) so istanbul's
// coverage instrumentation can't leak `cov_*` calls into the browser predicate.
const waitForRowCost = (page: Page, label: string, want: 'positive' | 'zero') =>
  page.waitForFunction(
    (sel: string, mode: string) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const m = (el.textContent ?? '').match(/Custo:\s*([\d.]+)/);
      if (!m) return false;
      const n = Number(m[1]);
      return mode === 'zero' ? n === 0 : n > 0;
    },
    {},
    costSelector(label),
    want,
  );

const expandElectivesAccordion = async (p: Page) => {
  await ensureGarmentDetailsAccordionExpanded(p);
  await expandAccordion(p, 'Eletivos da Peça');
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-logoElectiveGate');

  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-logoElectiveGate');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('logo elective gate (E2E)', () => {
  it('skips the logo cost while its elective is off and restores it when on', async () => {
    const id = `e2e-gate-${uniqueSuffix()}`;
    const name = `E2E ${id}`;
    const logoLabel = 'gated-logo';
    const electiveLabel = `el-${uniqueSuffix()}`;

    await createModelTool.execute({ name, id });
    await page!.waitForSelector('[role="pointer-panel-content"] #name', { hidden: true });
    await openModelTool.execute({ modelName: name });
    await switchViewTool.execute({ view: 'svg' });
    await page!.waitForSelector('[data-testid="svg-empty-state"]');
    await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
    await page!.waitForSelector('#svg-editor');

    // Logo with one priced placement at the default 8x8 cm / embroidery →
    // cost 1*8*8*1 = 64. Pricing is per placement, so the expression goes there.
    await addLogoTool.execute({
      name: logoLabel,
      method: 'embroidery',
      sourceFixturePath: LOGO_FIXTURE_PATH,
    });
    await page!.waitForSelector(`[data-testid="logo-item"][data-logo-label="${logoLabel}"]`);
    await addLogoPlacementTool.execute({
      logoLabel,
      costExpression: 'colors * width * height * methodFactor',
    });
    await waitForRowCost(page!, logoLabel, 'positive');
    // The placements pointer panel is left open with focus in the cost-expression
    // input; clear it so the add-elective panel opens cleanly.
    await resetUIState(page!);

    // Elective ON, then gate the logo on it — cost stays > 0.
    await addElectiveTool.execute({ name: electiveLabel, isDefault: true });
    await linkLogoElectiveTool.execute({ logoLabel, electiveLabel });
    await waitForRowCost(page!, logoLabel, 'positive');

    // Turn the elective OFF → logo cost skipped (0) and audit reports skipped.
    await expandElectivesAccordion(page!);
    await setElectiveValue(page!, electiveLabel, false);
    await waitForRowCost(page!, logoLabel, 'zero');

    await openLogoListAccordion(page!);
    await openLogoCostAudit(page!, logoLabel);
    await page!.waitForSelector('[role="pointer-panel-content"] [data-testid="logo-cost-audit-skipped"]');
    await resetUIState(page!);

    // Turn it back ON → cost restored.
    await expandElectivesAccordion(page!);
    await setElectiveValue(page!, electiveLabel, true);
    await waitForRowCost(page!, logoLabel, 'positive');
  }, 120_000);
});
