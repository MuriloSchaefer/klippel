/**
 * E2E tests for dragging PointerContainer panels.
 *
 * Exercises the real drag gesture (`#drag-panel` handle → pointer events on the
 * Modal → useDraggable → setPosition) and the `dragPointerPanelIntoView` test
 * helper against a running Electron. Skips when CDP is unreachable.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import {
  cleanupWorkspace,
  resetWorkspace,
} from '@helpers/puppeteer/resetWorkspace';
import {
  dragPointerPanelBy,
  dragPointerPanelIntoView,
  getPointerPanelRect,
} from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';

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

import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';

const VIEWPORT_MARGIN = 8;

const getViewport = (p: Page) =>
  p.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));

const openCreateModelPanel = async (p: Page) => {
  await p.click('[aria-label="create-model"]');
  await p.waitForSelector('[role="pointer-panel-content"] #name', {
    timeout: 10_000,
  });
};

const closeAnyPanel = async (p: Page) => {
  await p.keyboard.press('Escape').catch(() => {});
  await p
    .waitForSelector('[role="pointer-panel-content"]', {
      hidden: true,
      timeout: 5_000,
    })
    .catch(() => {});
};

describe('PointerContainer drag and drop (E2E)', () => {
  beforeAll(async () => {
    browser = await puppeteer.connect({
      browserURL: CDP_URL,
      defaultViewport: null,
    });
    const pages = await browser.pages();
    page =
      pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
    if (!page) throw new Error('No renderer page found in Electron');
    await resetWorkspace(page, 'e2e-pointer-drag');
    await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
    await switchRibbonTabTool.execute({ label: 'Compositor' });
    await page.waitForSelector('[aria-label="create-model"]', {
      timeout: 15_000,
    });
  }, 30_000);

  afterAll(async () => {
    if (browser) await browser.disconnect();
    cleanupWorkspace('e2e-pointer-drag');
  });

  beforeEach(async () => {
    if (page) await closeAnyPanel(page);
  }, 10_000);

  afterEach(async () => {
    if (page) await closeAnyPanel(page);
  }, 10_000);

  it('moves a panel by the requested delta when dragged from #drag-panel', async () => {
    await openCreateModelPanel(page!);

    const before = await getPointerPanelRect(page!);
    expect(before).not.toBeNull();

    // The create-model panel opens near the top-left corner, so drag down and
    // right — that direction has room before the viewport-clamp kicks in.
    const requested = { dx: 140, dy: 110 };
    const applied = await dragPointerPanelBy(page!, requested.dx, requested.dy);
    // The gesture stays within the viewport here, so the full delta applies.
    expect(applied.dx).toBeCloseTo(requested.dx, 0);
    expect(applied.dy).toBeCloseTo(requested.dy, 0);

    const after = await getPointerPanelRect(page!);
    expect(after).not.toBeNull();
    // The panel moved by exactly the applied gesture delta.
    expect(after!.x - before!.x).toBeCloseTo(applied.dx, 0);
    expect(after!.y - before!.y).toBeCloseTo(applied.dy, 0);
    // Size is unchanged — it only moved.
    expect(after!.width).toBeCloseTo(before!.width, 0);
    expect(after!.height).toBeCloseTo(before!.height, 0);
  }, 30_000);

  it('dragPointerPanelIntoView pulls an off-screen panel back into the viewport', async () => {
    await openCreateModelPanel(page!);

    // Shove the panel hard toward the bottom edge. The drag handle is clamped
    // to the viewport, so the panel's body ends up overflowing past the bottom.
    await dragPointerPanelBy(page!, 0, 10_000);

    const viewport = await getViewport(page!);
    const offScreen = await getPointerPanelRect(page!);
    expect(offScreen).not.toBeNull();
    expect(offScreen!.bottom).toBeGreaterThan(viewport.height);

    await dragPointerPanelIntoView(page!);

    const onScreen = await getPointerPanelRect(page!);
    expect(onScreen).not.toBeNull();
    // Fully within the viewport, respecting the helper's margin (with a small
    // tolerance for sub-pixel rounding).
    expect(onScreen!.x).toBeGreaterThanOrEqual(VIEWPORT_MARGIN - 1);
    expect(onScreen!.y).toBeGreaterThanOrEqual(VIEWPORT_MARGIN - 1);
    expect(onScreen!.right).toBeLessThanOrEqual(
      viewport.width - VIEWPORT_MARGIN + 1,
    );
    expect(onScreen!.bottom).toBeLessThanOrEqual(
      viewport.height - VIEWPORT_MARGIN + 1,
    );
  }, 30_000);
});
