/**
 * E2E for the Accordion `focusOnOpen` contract (kernel Layout Accordion +
 * `focusFirstRow`), exercised through the Composer settings-panel accordions:
 *
 *  - Expanding a *populated* accordion moves focus to its first list row
 *    (a non-button `[tabindex="0"]`), NOT the "add" control that precedes it.
 *  - Expanding an *empty* accordion falls back to the add control, so the
 *    keyboard still lands somewhere useful.
 *
 * Focus is asserted via a `:focus` selector wait (post-transition state), never
 * a timer. Skips if the Klippel dev app is unreachable over CDP.
 */
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

import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { addElectiveTool } from '@system/modules/Composer/mcpTools/addElective';
import { deleteElectiveTool } from '@system/modules/Composer/mcpTools/deleteElective';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import {
  collapseAccordion,
  expandAccordion,
} from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);
const electiveRowSel = (label: string) =>
  `[data-testid="elective-item"][data-elective-label="${label}"]`;

/** Force an open transition (so the Accordion's onEntered → focusOnOpen fires)
 *  regardless of the accordion's current state. */
const reopenAccordion = async (name: string) => {
  await collapseAccordion(page!, name);
  await expandAccordion(page!, name);
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-accordion-focus');

  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');

  const id = `e2e-acc-focus-${uniqueSuffix()}`;
  const name = `AccFocus ${uniqueSuffix()}`;
  await createModelTool.execute({ name, id });
  await page.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
  await openModelTool.execute({ modelName: name });
  await ensureSettingsPanelExpanded(page);
}, 60_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-accordion-focus');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 15_000);

describe('accordion focus-on-open (E2E)', () => {
  it('focuses the first row (not the add control) when a populated accordion is expanded', async () => {
    const label = `acc-focus-${uniqueSuffix()}`;
    await addElectiveTool.execute({ name: label });
    await page!.waitForSelector(electiveRowSel(label));

    await reopenAccordion('Eletivos');

    await page!.waitForSelector('[data-testid="elective-item"]:focus');
    const focused = await page!.evaluate(
      () => document.activeElement?.getAttribute('data-testid') ?? null,
    );
    expect(focused).toBe('elective-item');

    await deleteElectiveTool.execute({ label }).catch(() => {});
  }, 60_000);

  it('falls back to the add control when an empty accordion is expanded', async () => {
    // No logos exist in this model, so the only tab stop is the add button.
    await reopenAccordion('Logos');

    await page!.waitForSelector('[data-testid="add-logo"]:focus');
    const focused = await page!.evaluate(
      () => document.activeElement?.getAttribute('data-testid') ?? null,
    );
    expect(focused).toBe('add-logo');
  }, 60_000);
});
