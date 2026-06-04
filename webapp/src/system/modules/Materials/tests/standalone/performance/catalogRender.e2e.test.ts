/**
 * Performance e2e — MaterialStock viewport under a synthetic catalog.
 *
 * For each cardinality tier the catalog is seeded ONCE (in `beforeAll`)
 * and three surfaces are measured against per-tier budgets:
 *
 *   - render  — time from issuing the seed to all N rows being on screen
 *               (`data-material-count` mirror == N): seed-write +
 *               catalog-load IPC + Redux + DataGrid render.
 *   - search  — time to filter N materials down to the single planted
 *               `__probe_search__` row (mirror == 1). Re-filters all N
 *               in one pass, so it scales with the catalog size.
 *   - scroll  — wall-clock of a wheel-driven scroll sweep over the
 *               virtualized grid (responsiveness, not frame timing —
 *               that belongs to the debug-traces / perf-trace tooling).
 *
 * Each tier also proves O(1) addressability: a planted probe and a
 * derived sample id resolve via the by-id IPC without scanning the
 * catalog (e2e-tests.md §11.3/§11.4).
 *
 * Results print one `[perf] …` line per surface and are appended to
 * `.tests-executions/perf-results.jsonl` for trending (§11.1).
 *
 * Budgets are PLACEHOLDERS pending calibration on reference hardware.
 * Scope: standalone, ≤ 1k live-IPC tier. 10k/100k need out-of-band
 * direct-SQLite seeding (§11.2). NOTE: the MUI DataGrid paginates at 100
 * rows/page, so the scroll sweep exercises page-1 virtualization, not
 * the full dataset — page-navigation latency is a separate surface.
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import {
  cleanupWorkspace,
  resetWorkspace,
} from "@helpers/puppeteer/resetWorkspace";
import { resetUIState } from "@helpers/puppeteer/closeOverlays";
import { clickRibbonTab } from "@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer";
import {
  seedSyntheticMaterials,
  LIVE_SEED_MAX,
} from "@helpers/puppeteer/seedSyntheticMaterials";
import { PROBE_TOKENS, type CatalogIndex } from "@helpers/puppeteer/generateMaterialsCatalog";
import { searchMaterialsTool } from "@system/modules/Materials/mcpTools/searchMaterials";
import {
  expectWithinBudget,
  measure,
  recordPerf,
} from "@helpers/puppeteer/recordPerf";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const PROBES = 3; // generator plants 3 probe rows beyond the bulk count.
const VIEWPORT = '[data-testid="material-stock-viewport"]';
const SCROLLER = ".MuiDataGrid-virtualScroller";
const SCROLL_STEPS = 30;

/**
 * Cardinality tiers + per-surface budgets (ms). Placeholders — calibrate
 * on reference hardware, then tighten (§11.1).
 */
const TIERS: ReadonlyArray<{
  count: number;
  renderBudgetMs: number;
  searchBudgetMs: number;
  scrollBudgetMs: number;
}> = [
  { count: 100, renderBudgetMs: 1_500, searchBudgetMs: 1_500, scrollBudgetMs: 3_000 },
  { count: 500, renderBudgetMs: 4_500, searchBudgetMs: 2_500, scrollBudgetMs: 3_000 },
  { count: 1_000, renderBudgetMs: 10_000, searchBudgetMs: 4_000, scrollBudgetMs: 4_000 },
  // { count: 10_000, renderBudgetMs: 20_000, searchBudgetMs: 5_000, scrollBudgetMs: 5_000 }, // FREEZES
];

let browser: Browser | null = null;
let page: Page | null = null;

const switchToMateriaisTab = async (p: Page) => {
  await p.waitForFunction(
    /* istanbul ignore next */
    () => {
      const tabs = Array.from(
        document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
      );
      return tabs.some((t) => (t.textContent ?? "").trim() === "Materiais");
    },
  );
  const clicked = await clickRibbonTab(p, undefined, "Materiais");
  if (!clicked) throw new Error("Materiais ribbon tab not found after wait");
  await p.waitForSelector('[data-testid="open-material-stock"]');
};

const openStockViewport = async (p: Page) => {
  await p.click('[data-testid="open-material-stock"]');
  await p.waitForSelector(VIEWPORT);
};

/** Yield one paint frame — not a fixed-time sleep. */
const rafTick = (p: Page) =>
  p.evaluate(
    /* istanbul ignore next */
    () => new Promise<void>((res) => requestAnimationFrame(() => res())),
  );

const getById = (p: Page, id: string) =>
  p.evaluate(
    /* istanbul ignore next */
    (mid) => window.electron.jazz.materials.get(mid),
    id,
  );

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

describe.each(TIERS)(
  "MaterialStock viewport — $count materials (perf)",
  ({ count, renderBudgetMs, searchBudgetMs, scrollBudgetMs }) => {
    const WORKSPACE = `perf-viewport-${count}`;
    const total = count + PROBES;

    // Captured by the one-time seed in `beforeAll`; asserted in the
    // render `it` and reused by search/scroll (no reseed per surface).
    let index: CatalogIndex;
    let seedMs = 0;
    let totalMs = 0;

    beforeAll(async () => {
      await resetWorkspace(page!, WORKSPACE);
      await page!.waitForSelector("#ribbon-menu-tabs");
      await switchToMateriaisTab(page!);
      await openStockViewport(page!);

      expect(count).toBeLessThanOrEqual(LIVE_SEED_MAX);
      const seeded = await seedSyntheticMaterials(page!, {
        count,
        seed: `viewport-${count}`,
      });
      index = seeded.index;
      seedMs = seeded.seedMs;
      totalMs = seeded.totalMs;
    }, 180_000);

    afterAll(() => cleanupWorkspace(WORKSPACE));

    it(`renders ${count} materials within ${renderBudgetMs}ms`, async () => {
      expect(index.count).toBe(total);

      // Context-only sub-measurement: the bulk-write cost.
      recordPerf({
        surface: "seed-write",
        cardinality: total,
        peers: 1,
        metric: "ms",
        value: seedMs,
      });
      expectWithinBudget(
        { surface: "render", cardinality: total, peers: 1, metric: "ms", value: totalMs },
        renderBudgetMs,
      );

      // O(1) addressability (§11.3/§11.4): a planted probe and a derived
      // sample id resolve through the by-id IPC — no catalog scan.
      const probe = await getById(page!, index.probes.search);
      expect(probe?.id).toBe(index.probes.search);
      const sampleId = index.sampleIds[1];
      const sample = await getById(page!, sampleId);
      expect(sample?.id).toBe(sampleId);
    }, 60_000);

    it(`searches ${count} materials down to 1 within ${searchBudgetMs}ms`, async () => {
      // Drive the real search UI (click-focus + type) — the production
      // filter path. The planted probe carries the token as `externalId`,
      // a search key, so the query narrows to exactly that one row.
      const { ms } = await measure(async () => {
        await searchMaterialsTool.execute({ query: PROBE_TOKENS.search });
        await page!.waitForSelector(`${VIEWPORT}[data-material-count="1"]`);
      });

      expectWithinBudget(
        { surface: "search", cardinality: total, peers: 1, metric: "ms", value: ms },
        searchBudgetMs,
      );

      // Clear the query so the next `it` starts from the full catalog.
      await searchMaterialsTool.execute({ query: "" });
      await page!.waitForSelector(`${VIEWPORT}[data-material-count="${total}"]`);
    }, 60_000);

    it(`scrolls ${count} materials within ${scrollBudgetMs}ms`, async () => {
      await page!.waitForSelector(SCROLLER);
      const box = await (await page!.$(SCROLLER))!.boundingBox();
      if (!box) throw new Error("virtual scroller has no box");

      const scrollable = await page!.evaluate(
        /* istanbul ignore next */
        (sel) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          return !!el && el.scrollHeight > el.clientHeight + 4;
        },
        SCROLLER,
      );
      expect(scrollable).toBe(true);

      await page!.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      const { ms } = await measure(async () => {
        for (let i = 0; i < SCROLL_STEPS; i++) {
          await page!.mouse.wheel({ deltaY: 800 });
          await rafTick(page!); // wait a paint, not a fixed duration
        }
      });

      // The grid actually scrolled (and survived the sweep).
      const scrolledTop = await page!.evaluate(
        /* istanbul ignore next */
        (sel) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          return el?.scrollTop ?? 0;
        },
        SCROLLER,
      );
      expect(scrolledTop).toBeGreaterThan(0);

      expectWithinBudget(
        { surface: "scroll", cardinality: total, peers: 1, metric: "ms", value: ms },
        scrollBudgetMs,
      );
    }, 60_000);
  },
);
