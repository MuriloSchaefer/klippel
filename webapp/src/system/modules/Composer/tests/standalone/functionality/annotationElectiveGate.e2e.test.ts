/**
 * E2E test for the annotation elective gate. An annotation linked to an elective
 * is hidden from the editor SVG while that elective is off, and reappears when it
 * is turned back on. (Unlike logos, annotations have no cost — the gate is purely
 * visual, reconciled by the AnnotationOverlay.)
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

import { addAnnotationTool } from '@system/modules/Composer/mcpTools/addAnnotation';
import { linkAnnotationElectiveTool } from '@system/modules/Composer/mcpTools/linkAnnotationElective';
import { addElectiveTool } from '@system/modules/Composer/mcpTools/addElective';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import { setElectiveValue } from '@system/modules/Composer/components/viewports/ElectiveListAccordion/drivers/ElectiveItem.click.puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ANNOTATION_TEXT_SELECTOR } from '@system/modules/Composer/components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');
const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const expandElectivesAccordion = async (p: Page) => {
  await ensureSettingsPanelExpanded(p);
  await expandAccordion(p, 'Eletivos');
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-annotationElectiveGate');

  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-annotationElectiveGate');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('annotation elective gate (E2E)', () => {
  it('hides the annotation while its elective is off and restores it when on', async () => {
    const id = `e2e-agate-${uniqueSuffix()}`;
    const name = `E2E ${id}`;
    const annotationLabel = 'gated-note';
    const electiveLabel = `el-${uniqueSuffix()}`;

    await createModelTool.execute({ name, id });
    await page!.waitForSelector('[role="pointer-panel-content"] #name', { hidden: true });
    await openModelTool.execute({ modelName: name });
    await switchViewTool.execute({ view: 'svg' });
    await page!.waitForSelector('[data-testid="svg-empty-state"]');
    await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
    await page!.waitForSelector('#svg-editor');
    await openGarmentDetailsTool.execute();

    await addAnnotationTool.execute({ label: annotationLabel, text: 'Visível?' });
    await page!.waitForSelector(ANNOTATION_TEXT_SELECTOR, { visible: true });

    // Elective ON, then gate the annotation on it — still visible.
    await addElectiveTool.execute({ name: electiveLabel, isDefault: true });
    await linkAnnotationElectiveTool.execute({ annotationLabel, electiveLabel });
    await page!.waitForSelector(ANNOTATION_TEXT_SELECTOR, { visible: true });

    // Turn the elective OFF → annotation hidden from the drawing.
    await expandElectivesAccordion(page!);
    await setElectiveValue(page!, electiveLabel, false);
    await page!.waitForSelector(ANNOTATION_TEXT_SELECTOR, { hidden: true });

    // Turn it back ON → annotation reappears.
    await setElectiveValue(page!, electiveLabel, true);
    await page!.waitForSelector(ANNOTATION_TEXT_SELECTOR, { visible: true });
  }, 120_000);
});
