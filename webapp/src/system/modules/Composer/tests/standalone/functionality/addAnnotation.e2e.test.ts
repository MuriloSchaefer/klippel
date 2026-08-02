/**
 * E2E tests for annotations: add (click + shortcut), edit text, drag the target
 * point, and delete. Assertions check the ACTUAL editor render (the injected
 * <text>/<line>/<circle> under #svg-editor), not just graph nodes. Skips if CDP
 * is unreachable.
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
import { addAnnotationShortcutTool } from '@system/modules/Composer/mcpTools/addAnnotationShortcut';
import { editAnnotationTool } from '@system/modules/Composer/mcpTools/editAnnotation';
import { deleteAnnotationTool } from '@system/modules/Composer/mcpTools/deleteAnnotation';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import {
  ANNOTATION_TARGET_SELECTOR,
  ANNOTATION_TEXT_SELECTOR,
  countAnnotationTexts,
} from '@system/modules/Composer/components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');
const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const setupModel = async () => {
  const id = `e2e-annot-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await page!.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
  await openModelTool.execute({ modelName: name });
  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector('[data-testid="svg-empty-state"]');
  await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
  await page!.waitForSelector('#svg-editor');
  await openGarmentDetailsTool.execute();
};

const firstTspanText = (page: Page) =>
  page.$eval(
    `${ANNOTATION_TEXT_SELECTOR} tspan`,
    (el) => (el.textContent ?? '').trim(),
  );

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-annotations');

  await page.waitForSelector('#ribbon-menu-tabs');
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-annotations');
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 10_000);

describe('addAnnotation via click (E2E)', () => {
  it('adds an annotation that renders as text + leader + target in the editor SVG, edits, drags the target, then deletes', async () => {
    await setupModel();

    await addAnnotationTool.execute({ label: 'note-click', text: 'Olá mundo' });

    // Renders in the editor SVG (not just a node).
    await page!.waitForSelector(ANNOTATION_TEXT_SELECTOR);
    await page!.waitForSelector(ANNOTATION_TARGET_SELECTOR);
    await page!.waitForSelector('#svg-editor line[id^="annotation-line-"]');
    expect(await countAnnotationTexts(page!)).toBe(1);
    expect(await firstTspanText(page!)).toBe('Olá mundo');

    // Edit the body — the editor <text> updates.
    await editAnnotationTool.execute({ label: 'note-click', text: 'Texto novo' });
    await page!.waitForFunction(
      () => {
        const t = document.querySelector('#svg-editor text[id^="annotation-text-"] tspan');
        return (t?.textContent ?? '').trim() === 'Texto novo';
      },
    );

    // Drag the target point — the leader line's target end (x1) follows.
    const lineSel = '#svg-editor line[id^="annotation-line-"]';
    const x1Before = await page!.$eval(lineSel, (el) => Number(el.getAttribute('x1')));
    const box = await (await page!.$(ANNOTATION_TARGET_SELECTOR))!.boundingBox();
    if (!box) throw new Error('target circle has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page!.mouse.move(cx, cy);
    await page!.mouse.down();
    await page!.mouse.move(cx + 60, cy + 40, { steps: 6 });
    await page!.mouse.up();
    await page!.waitForFunction(
      (sel: string, prev: number) => {
        const el = document.querySelector(sel);
        return el ? Number(el.getAttribute('x1')) !== prev : false;
      },
      {},
      lineSel,
      x1Before,
    );

    // Delete — the rendered text disappears.
    await deleteAnnotationTool.execute({ annotationLabel: 'note-click' });
    await page!.waitForSelector(ANNOTATION_TEXT_SELECTOR, { hidden: true });
    expect(await countAnnotationTexts(page!)).toBe(0);
  }, 120_000);
});

describe('addAnnotation via shortcut (E2E)', () => {
  it('adds an annotation by keyboard that renders in the editor SVG', async () => {
    await setupModel();

    await addAnnotationShortcutTool.execute({ label: 'note-key', text: 'Atalho' });

    await page!.waitForSelector(ANNOTATION_TEXT_SELECTOR);
    expect(await countAnnotationTexts(page!)).toBe(1);
    expect(await firstTspanText(page!)).toBe('Atalho');

    await deleteAnnotationTool.execute({ annotationLabel: 'note-key' });
    await page!.waitForSelector(ANNOTATION_TEXT_SELECTOR, { hidden: true });
  }, 120_000);
});
