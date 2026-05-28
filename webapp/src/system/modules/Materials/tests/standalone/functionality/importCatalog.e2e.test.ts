/**
 * E2E tests for the xlsx catalog importer — click + shortcut variants.
 *
 * Both paths drive the bundled `public/materials/materials.xlsx`
 * fixture through the `ImportCatalogSection` PointerContainer. The
 * importer runs in the main process and signals completion via the
 * `materials:import-finished` push channel, which the renderer surfaces
 * as a Snackbar (since the panel auto-closes on Confirm). We assert on
 * the snackbar's appearance and on the live catalog state via the
 * `window.electron.jazz.materials.load()` IPC — that's the
 * main-process view, so it reflects what was actually written.
 *
 * Idempotence: a second import of the same fixture must not duplicate
 * rows. The importer pre-computes a skip-set against the current
 * catalog; the re-run summary should report 0 added.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import {
  cleanupWorkspace,
  resetWorkspace,
} from '@helpers/puppeteer/resetWorkspace';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';
import { clickRibbonTab } from '@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer';
import {
  importFixtureCatalog,
  openImportCatalogPanel,
  pickFixture,
  confirmImport,
  waitForImportSummary,
} from '@system/modules/Materials/components/drivers/importCatalog.click.puppeteer';
import {
  importFixtureCatalogViaShortcut,
} from '@system/modules/Materials/components/drivers/importCatalog.shortcut.puppeteer';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

// Materials/kernelCalls.ts registers the Materiais tab asynchronously
// after the kernel boot, so wait for the label before clicking — same
// race the collaborative typeShareAndCreate test guards against.
const switchToMateriaisTab = async (p: Page) => {
  await p.waitForFunction(() => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
    );
    return tabs.some((t) => (t.textContent ?? '').trim() === 'Materiais');
  });
  const clicked = await clickRibbonTab(p, undefined, 'Materiais');
  if (!clicked) throw new Error('Materiais ribbon tab not found after wait');
  await p.waitForSelector('[data-testid="open-import-catalog"]');
};

const loadCatalogCounts = async (p: Page) =>
  p.evaluate(async () => {
    const snap = await window.electron.jazz.materials.load();
    return {
      types: Object.keys(snap.materialTypes ?? {}).length,
      materials: Object.keys(snap.materials ?? {}).length,
    };
  });

const dismissSnackbar = async (p: Page) => {
  await p
    .click('[data-testid="import-catalog-summary"] [aria-label="Close"]')
    .catch(() => {});
  await p.waitForSelector('[data-testid="import-catalog-summary"]', {
    hidden: true,
  });
};

beforeAll(async () => {
  browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  page =
    pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
}, 60_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 15_000);

// Each describe owns its own workspace so the file can be run with any
// `-t` filter (or with the describe blocks reordered) and still produce
// the same result. The file-level `beforeAll` only owns the browser
// connection; workspace state is per-describe.
describe('importCatalog via click (E2E)', () => {
  const WORKSPACE = 'e2e-import-catalog-click';

  beforeAll(async () => {
    await resetWorkspace(page!, WORKSPACE);
    await page!.waitForSelector('#ribbon-menu-tabs');
    await switchToMateriaisTab(page!);
  }, 60_000);

  afterAll(() => cleanupWorkspace(WORKSPACE));

  it('imports the bundled fixture and populates the live catalog', async () => {
    const before = await loadCatalogCounts(page!);
    expect(before).toEqual({ types: 0, materials: 0 });

    await importFixtureCatalog(page!);

    await page!.waitForFunction(async () => {
      const snap = await window.electron.jazz.materials.load();
      return Object.keys(snap.materials ?? {}).length > 0;
    });

    const after = await loadCatalogCounts(page!);
    expect(after.types).toBeGreaterThan(0);
    expect(after.materials).toBeGreaterThan(0);
  }, 90_000);

  it('is idempotent — re-importing the fixture adds no new rows', async () => {
    // Self-contained: seed the catalog ourselves so the test runs the
    // same whether the file is executed in order, in isolation via a
    // `-t` filter, or with the describe blocks reordered. `importFixtureCatalog`
    // leaves the import panel open on the post-import summary view —
    // drain UI state before the re-import so the dismiss-snackbar click
    // isn't intercepted by the still-open modal.
    const initial = await loadCatalogCounts(page!);
    if (initial.materials === 0) {
      await importFixtureCatalog(page!);
      await page!.waitForFunction(async () => {
        const snap = await window.electron.jazz.materials.load();
        return Object.keys(snap.materials ?? {}).length > 0;
      });
      await resetUIState(page!);
    }

    const before = await loadCatalogCounts(page!);
    expect(before.materials).toBeGreaterThan(0);

    await dismissSnackbar(page!);

    await openImportCatalogPanel(page!);
    await pickFixture(page!);
    await confirmImport(page!);
    await openImportCatalogPanel(page!);
    await waitForImportSummary(page!);

    const after = await loadCatalogCounts(page!);
    expect(after).toEqual(before);
  }, 120_000);
});

describe('importCatalog via shortcut (E2E)', () => {
  const WORKSPACE = 'e2e-import-catalog-shortcut';

  beforeAll(async () => {
    await resetWorkspace(page!, WORKSPACE);
    await page!.waitForSelector('#ribbon-menu-tabs');
    await switchToMateriaisTab(page!);
  }, 60_000);

  afterAll(() => cleanupWorkspace(WORKSPACE));

  it('opens the panel via the `a` shortcut and imports the fixture', async () => {
    const before = await loadCatalogCounts(page!);
    expect(before).toEqual({ types: 0, materials: 0 });

    await importFixtureCatalogViaShortcut(page!);

    await page!.waitForFunction(async () => {
      const snap = await window.electron.jazz.materials.load();
      return Object.keys(snap.materials ?? {}).length > 0;
    });

    const after = await loadCatalogCounts(page!);
    expect(after.types).toBeGreaterThan(0);
    expect(after.materials).toBeGreaterThan(0);
    await page!.waitForSelector('[data-testid="import-catalog-summary"]');
  }, 90_000);
});
