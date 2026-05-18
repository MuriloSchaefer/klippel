/**
 * E2E tests for uploadVariationSVG and uploadVariationSVGShortcut MCP tools.
 *
 * Each test creates its own model: uploading mutates `variation.state.svg`
 * irreversibly (the empty state unmounts), so a single model can't host both
 * the click and shortcut paths.
 *
 * Skips if CDP is unreachable.
 */
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';

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

import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { uploadVariationSVGShortcutTool } from '@system/modules/Composer/mcpTools/uploadVariationSVGShortcut';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import { clickViewportTabByIndex } from '@kernel/modules/Layout/components/ViewportManager/drivers/ViewportTabs.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForFormClosed = async (p: Page) => {
  await p.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
};

const createAndOpenModel = async (label = 'UploadSVG') => {
  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E ${label} ${id}`;
  await createModelTool.execute({ name, id });
  await waitForFormClosed(page!);
  await openModelTool.execute({ modelName: name });
  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector(
    '#composer-active-view[data-active-view="svg"]',
    { timeout: 10_000 },
  );
  await page!.waitForSelector('[data-testid="svg-empty-state"]', {
    timeout: 10_000,
  });
  return { id, name };
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-uploadVariationSVG');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-uploadVariationSVG');
});

describe('uploadVariationSVG via click (E2E)', () => {
  it('uploads an SVG by clicking the empty-state button', async () => {
    await createAndOpenModel();
    await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
    await page!.waitForSelector('[data-testid="svg-empty-state"]', {
      hidden: true,
      timeout: 10_000,
    });
    await page!.waitForSelector('#svg-editor', { timeout: 10_000 });
  }, 60_000);
});

describe('uploadVariationSVG via shortcut (E2E)', () => {
  it('uploads an SVG by pressing the "u" shortcut', async () => {
    await createAndOpenModel();
    await uploadVariationSVGShortcutTool.execute({ filePath: FIXTURE_PATH });
    await page!.waitForSelector('[data-testid="svg-empty-state"]', {
      hidden: true,
      timeout: 10_000,
    });
    await page!.waitForSelector('#svg-editor', { timeout: 10_000 });
  }, 60_000);
});

describe('uploadVariationSVG across multiple model tabs (E2E)', () => {
  const countViewportTabs = (p: Page) =>
    p.$$eval('[role="viewport-tabs"] [role="tab"]', (els) =>
      els.filter((e) => e.id !== 'home' && e.id !== 'new-viewport').length,
    );

  const waitForSelectedTab = async (p: Page, modelName: string) => {
    const start = Date.now();
    while (Date.now() - start < 10_000) {
      const ok = await p.$$eval(
        '[role="viewport-tabs"] [aria-selected="true"]',
        (els, target) => els.some((e) => (e.textContent ?? '').includes(target)),
        modelName,
      );
      if (ok) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`tab containing "${modelName}" not selected within 10s`);
  };

  // Wait until #svg-editor has the fixture's shapes injected. An empty
  // <svg id="svg-editor"> can exist before injection completes, so child
  // count alone is the reliable signal that the file actually rendered.
  const waitForFixtureRendered = async (p: Page) => {
    await p.waitForFunction(() => {
      const editor = document.querySelector('#svg-editor');
      if (!editor) return false;
      return (
        editor.querySelectorAll('circle').length >= 3 &&
        editor.querySelectorAll('path').length >= 2 &&
        editor.querySelectorAll('rect').length >= 1
      );
    });
  };

  // Toggle graph -> svg to force the active viewport's SVGView to unmount and
  // remount; without this, a stale #svg-editor from the previous tab can give
  // a false positive.
  const remountSVGViewAndAssert = async (p: Page) => {
    await switchViewTool.execute({ view: 'graph' });
    await p.waitForSelector(
      '#composer-active-view[data-active-view="graph"]',
      { timeout: 10_000 },
    );
    await p.waitForSelector('#svg-editor', { hidden: true, timeout: 10_000 });

    await switchViewTool.execute({ view: 'svg' });
    await p.waitForSelector(
      '#composer-active-view[data-active-view="svg"]',
      { timeout: 10_000 },
    );
    await p.waitForSelector('#svg-editor', { timeout: 10_000 });
    await p.waitForSelector('[data-testid="svg-empty-state"]', {
      hidden: true,
      timeout: 5_000,
    });
    await waitForFixtureRendered(p);
  };

  it('keeps uploaded SVGs visible when switching between model tabs', async () => {
    const baseTabs = await countViewportTabs(page!);

    const a = await createAndOpenModel('TabA');
    await uploadVariationSVGShortcutTool.execute({ filePath: FIXTURE_PATH });
    await page!.waitForSelector('#svg-editor', { timeout: 10_000 });
    await waitForFixtureRendered(page!);
    const indexA = baseTabs + 1;

    const b = await createAndOpenModel('TabB');
    await uploadVariationSVGShortcutTool.execute({ filePath: FIXTURE_PATH });
    await page!.waitForSelector('#svg-editor', { timeout: 10_000 });
    await waitForFixtureRendered(page!);
    const indexB = baseTabs + 2;

    const switchedToA = await clickViewportTabByIndex(page!, indexA);
    expect(switchedToA).toBe(true);
    await waitForSelectedTab(page!, a.name);
    await remountSVGViewAndAssert(page!);

    const switchedToB = await clickViewportTabByIndex(page!, indexB);
    expect(switchedToB).toBe(true);
    await waitForSelectedTab(page!, b.name);
    await remountSVGViewAndAssert(page!);

    const backToA = await clickViewportTabByIndex(page!, indexA);
    expect(backToA).toBe(true);
    await waitForSelectedTab(page!, a.name);
    await remountSVGViewAndAssert(page!);
  }, 120_000);
});

describe('uploadVariationSVG validation', () => {
  it('rejects a non-svg path (click variant)', async () => {
    await expect(
      uploadVariationSVGTool.execute({ filePath: '/tmp/not-an-svg.png' }),
    ).rejects.toThrow(/\.svg/);
  });

  it('rejects a non-svg path (shortcut variant)', async () => {
    await expect(
      uploadVariationSVGShortcutTool.execute({ filePath: '/tmp/not-an-svg.png' }),
    ).rejects.toThrow(/\.svg/);
  });

  it('rejects a missing file (click variant)', async () => {
    await expect(
      uploadVariationSVGTool.execute({
        filePath: '/tmp/definitely-not-here-12345.svg',
      }),
    ).rejects.toThrow(/does not exist/);
  });

  it('rejects a relative path (click variant)', async () => {
    await expect(
      uploadVariationSVGTool.execute({ filePath: 'relative.svg' }),
    ).rejects.toThrow(/absolute/);
  });
});
