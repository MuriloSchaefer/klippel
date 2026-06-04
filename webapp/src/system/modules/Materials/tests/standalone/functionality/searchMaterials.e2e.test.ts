/**
 * E2E tests for the MaterialStock search field — click + shortcut variants.
 *
 * Both paths seed a small synthetic catalog (via the shared perf
 * generator, which plants a uniquely-labelled `__probe_search__` row),
 * then narrow the grid by typing that token and assert the grid filtered
 * to exactly that one material. The token carries through as the
 * material's `externalId`, which `useFilteredMaterials` searches; its
 * underscores never appear in the bulk dictionary, so the query is unique
 * by construction.
 *
 * We assert on the live UI: the `data-material-count` mirror on the
 * viewport (post-filter row count) and the surviving DataGrid row's
 * `data-id` (MUI stamps each row with its `getRowId`, which is the
 * material id). The click variant drives the field via a real click +
 * type; the shortcut variant focuses via the `/` binding and types — it
 * imports no `*.click.puppeteer.ts` driver so the two paths stay
 * genuinely independent (e2e-tests.md §5).
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import {
  cleanupWorkspace,
  resetWorkspace,
} from "@helpers/puppeteer/resetWorkspace";
import { resetUIState } from "@helpers/puppeteer/closeOverlays";
import { clickRibbonTab } from "@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer";
import { seedSyntheticMaterials } from "@helpers/puppeteer/seedSyntheticMaterials";
import {
  PROBE_TOKENS,
  type CatalogIndex,
} from "@helpers/puppeteer/generateMaterialsCatalog";
import { searchMaterialsTool } from "@system/modules/Materials/mcpTools/searchMaterials";
import { searchMaterialsShortcutTool } from "@system/modules/Materials/mcpTools/searchMaterialsShortcut";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const COUNT = 12; // bulk materials; + 3 planted probes ⇒ 15 total.
const VIEWPORT = '[data-testid="material-stock-viewport"]';
const TABLE = '[data-testid="material-stock-table"]';

let browser: Browser | null = null;
let page: Page | null = null;

// Materials/kernelCalls.ts registers the Materiais tab asynchronously
// after the kernel boot, so wait for the label before clicking.
const switchToMateriaisTab = async (p: Page) => {
  await p.waitForFunction(() => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
    );
    return tabs.some((t) => (t.textContent ?? "").trim() === "Materiais");
  });
  const clicked = await clickRibbonTab(p, undefined, "Materiais");
  if (!clicked) throw new Error("Materiais ribbon tab not found after wait");
  await p.waitForSelector('[data-testid="open-material-stock"]');
};

const openStockViewport = async (p: Page) => {
  await p.click('[data-testid="open-material-stock"]');
  await p.waitForSelector(VIEWPORT);
};

/** Reset + seed a fresh workspace and return the index sidecar. */
const seedWorkspace = async (p: Page, workspace: string, seed: string) => {
  await resetWorkspace(p, workspace);
  await p.waitForSelector("#ribbon-menu-tabs");
  await switchToMateriaisTab(p);
  await openStockViewport(p);
  const { index } = await seedSyntheticMaterials(p, { count: COUNT, seed });
  return index;
};

/** Assert the grid narrowed to exactly the planted search probe. */
const expectNarrowedToProbe = async (p: Page, index: CatalogIndex) => {
  await p.waitForSelector(`${VIEWPORT}[data-material-count="1"]`);
  await p.waitForSelector(`${TABLE} .MuiDataGrid-row[data-id="${index.probes.search}"]`);
};

beforeAll(async () => {
  browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith("http://localhost:")) ?? pages[0];
  if (!page) throw new Error("No renderer page found in Electron");
}, 60_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 15_000);

// Each describe owns its own workspace so the file runs the same under
// any `-t` filter or describe reordering (mirrors importCatalog.e2e).
describe("searchMaterials via click (E2E)", () => {
  const WORKSPACE = "e2e-search-materials-click";
  let index: CatalogIndex;

  beforeAll(async () => {
    index = await seedWorkspace(page!, WORKSPACE, "search-click");
  }, 90_000);

  afterAll(() => cleanupWorkspace(WORKSPACE));

  it("filters the grid down to the typed material", async () => {
    // Precondition: the full catalog is on screen.
    await page!.waitForSelector(`${VIEWPORT}[data-material-count="${index.count}"]`);

    await searchMaterialsTool.execute({ query: PROBE_TOKENS.search });

    await expectNarrowedToProbe(page!, index);
  }, 90_000);
});

describe("searchMaterials via shortcut (E2E)", () => {
  const WORKSPACE = "e2e-search-materials-shortcut";
  let index: CatalogIndex;

  beforeAll(async () => {
    index = await seedWorkspace(page!, WORKSPACE, "search-shortcut");
  }, 90_000);

  afterAll(() => cleanupWorkspace(WORKSPACE));

  it("focuses via `/` and filters the grid down to the typed material", async () => {
    await page!.waitForSelector(`${VIEWPORT}[data-material-count="${index.count}"]`);

    // `/` must route to the focus shortcut, so focus must not already be
    // in a text input — `beforeEach`'s resetUIState blurs it.
    await searchMaterialsShortcutTool.execute({ query: PROBE_TOKENS.search });

    await expectNarrowedToProbe(page!, index);
  }, 90_000);
});
