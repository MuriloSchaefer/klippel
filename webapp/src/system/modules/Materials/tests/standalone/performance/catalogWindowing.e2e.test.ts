/**
 * Performance e2e — the **windowed** MaterialStock surface at thousands of
 * materials: paging, search, and the bound on what the renderer keeps.
 *
 * `catalogRender.e2e.test.ts` measures the ≤ 1k single-call-seed tier and the
 * cost of getting a catalog on screen. This file measures the properties that
 * only appear once the catalog is bigger than the window — the ones a user
 * reports as "the table glitches when I scroll or search":
 *
 *   - window-open  — seed → usable stock view, minus the fixture write. Must
 *                    be ~flat across tiers: the renderer mirrors a page, so
 *                    opening a 10k catalog is not 10× opening a 1k one.
 *   - search       — a query against the *whole* catalog (it runs in main over
 *                    a cached index) narrowing to the planted probe row.
 *   - page-in      — one "load more" round trip: request → the next page
 *                    resident. Sampled over several pages; p50/p95 recorded.
 *                    This is the number that decides whether a scroll that
 *                    outruns the resident rows feels smooth or stalls.
 *   - scroll-sweep — wall-clock of a wheel sweep over the virtualized grid,
 *                    with pages streaming in underneath it. Responsiveness,
 *                    not frame timing (that is the debug-traces tooling).
 *   - mirror-bound — how many rows Redux still holds after browsing deep and
 *                    then searching, once the residency sweep has run. A
 *                    **count** budget, not a time one: it is the assertion
 *                    that the mirror gives rows back
 *                    (`store/materials/residency.ts`) rather than converging
 *                    on the whole catalog.
 *
 * Seeding uses the batched live path (§11.2, "10k → batched seed (chunked)"),
 * which is also a realistic write load: chunks land while the viewport is
 * open, so every tier exercises delta ticks during a bulk import.
 *
 * Tiers above `HEAVY_MIN` only run with `KLIPPEL_PERF_HEAVY=1`: their seed
 * dominates the run, and until the materialize-once + `cpSync` base of §11.2
 * exists there is no way around paying it per run.
 *
 * Budgets: calibrated from a reference run on this repo's dev machine; the
 * jsonl trend in `.tests-executions/` is the real signal (§11.1).
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import {
  cleanupWorkspace,
  resetWorkspace,
} from "@helpers/puppeteer/resetWorkspace";
import { resetUIState } from "@helpers/puppeteer/closeOverlays";
import { clickRibbonTab } from "@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer";
import { seedSyntheticMaterialsChunked } from "@helpers/puppeteer/seedSyntheticMaterials";
import {
  PROBE_TOKENS,
  type CatalogIndex,
} from "@helpers/puppeteer/generateMaterialsCatalog";
import { searchMaterialsTool } from "@system/modules/Materials/mcpTools/searchMaterials";
import {
  expectWithinBudget,
  measure,
  recordPerf,
} from "@helpers/puppeteer/recordPerf";
import {
  configureMaterialsResidency,
  sweepMaterialsResidency,
} from "@system/modules/Materials/store/materials/actions";
import { DEFAULT_RESIDENCY_CONFIG } from "@system/modules/Materials/store/materials/residency";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const PROBES = 3; // generator plants 3 probe rows beyond the bulk count.
const VIEWPORT = '[data-testid="material-stock-viewport"]';
const SCROLLER = ".MuiDataGrid-virtualScroller";
const LOAD_MORE = '[data-testid="material-stock-load-more"]';
const SCROLL_STEPS = 40;
/** Pages to request when sampling `page-in`. */
const PAGE_SAMPLES = 5;

/** Tiers past this need `KLIPPEL_PERF_HEAVY=1` — see the header. */
const HEAVY_MIN = 5_000;
const HEAVY = process.env.KLIPPEL_PERF_HEAVY === "1";

/**
 * While measuring the mirror bound the TTL is shortened to something a test
 * can wait out. The production default (5 min) is not a number to sleep on,
 * and the *rule* under test — unprotected rows age out — is the same at any
 * TTL.
 */
const TEST_TTL_MS = 1_000;

type Tier = {
  count: number;
  /** Seed → usable stock view, fixture write excluded (ms). */
  openBudgetMs: number;
  /** Query → the single probe row on screen (ms). */
  searchBudgetMs: number;
  /** One page round trip, p95 across samples (ms). */
  pageInBudgetMs: number;
  /** Wheel sweep over the grid (ms). */
  scrollBudgetMs: number;
  /**
   * Rows Redux may still hold after browsing deep and then searching.
   * A *fraction of the catalog*, not a multiple of the page size, would be
   * the wrong shape of budget — this must not scale with the tier.
   */
  residentBudget: number;
};

const TIERS: ReadonlyArray<Tier> = [
  {
    count: 1_000,
    openBudgetMs: 2_500,
    searchBudgetMs: 1_500,
    pageInBudgetMs: 1_200,
    scrollBudgetMs: 3_000,
    residentBudget: 900,
  },
  {
    count: 5_000,
    openBudgetMs: 3_500,
    searchBudgetMs: 2_000,
    pageInBudgetMs: 1_500,
    scrollBudgetMs: 3_500,
    residentBudget: 900,
  },
  {
    count: 10_000,
    openBudgetMs: 4_500,
    searchBudgetMs: 2_500,
    pageInBudgetMs: 2_000,
    scrollBudgetMs: 4_000,
    residentBudget: 900,
  },
].filter((t) => HEAVY || t.count < HEAVY_MIN);

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

/**
 * Positions in the view — rows the list shows, resident or placeholder.
 * This is what a page grows by; `data-material-loaded` counts only the ones
 * whose data is actually here, which the residency sweep is entitled to move.
 */
const viewRows = async (p: Page): Promise<number> =>
  Number(
    await p.$eval(
      VIEWPORT,
      /* istanbul ignore next */
      (el) => (el as HTMLElement).dataset.materialView ?? "0",
    ),
  );

/**
 * Rows the materials slice holds — the mirror, which is a superset of the
 * view (pins, by-id resolves, pages the view has moved off).
 *
 * No `data-*` mirror for this on purpose: it would mean an `Object.keys` over
 * the slice on every render of the viewport, i.e. paying at 60 Hz for a
 * number only a test reads. Reading the store directly is the §11.6 case.
 */
const residentRows = async (p: Page): Promise<number> =>
  p.evaluate(
    /* istanbul ignore next */
    () => {
      const store = (
        globalThis as unknown as {
          __klippelStore__?: { getState: () => any };
        }
      ).__klippelStore__;
      if (!store) throw new Error("__klippelStore__ not exposed");
      return Object.keys(store.getState().Materials?.materials ?? {}).length;
    },
  );

/** Dispatch a plain action object built in node — no action-type strings here. */
const dispatch = async (p: Page, action: { type: string; payload?: unknown }) =>
  p.evaluate(
    /* istanbul ignore next */
    (a) => {
      const store = (
        globalThis as unknown as {
          __klippelStore__?: { dispatch: (x: unknown) => unknown };
        }
      ).__klippelStore__;
      if (!store) throw new Error("__klippelStore__ not exposed");
      store.dispatch(a);
    },
    action,
  );

const percentile = (values: number[], p: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
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

describe.each(TIERS)(
  "MaterialStock windowing — $count materials (perf)",
  ({
    count,
    openBudgetMs,
    searchBudgetMs,
    pageInBudgetMs,
    scrollBudgetMs,
    residentBudget,
  }) => {
    const WORKSPACE = `perf-windowing-${count}`;
    const total = count + PROBES;

    let index: CatalogIndex;
    let seedMs = 0;
    let totalMs = 0;

    beforeAll(async () => {
      await resetWorkspace(page!, WORKSPACE);
      await page!.waitForSelector("#ribbon-menu-tabs");
      await switchToMateriaisTab(page!);
      await openStockViewport(page!);

      const seeded = await seedSyntheticMaterialsChunked(page!, {
        count,
        seed: `windowing-${count}`,
      });
      index = seeded.index;
      seedMs = seeded.seedMs;
      totalMs = seeded.totalMs;
    }, 600_000);

    afterAll(async () => {
      // Put the residency knobs back before the next tier reuses this app.
      if (page) {
        await dispatch(
          page,
          configureMaterialsResidency(DEFAULT_RESIDENCY_CONFIG) as never,
        );
      }
      cleanupWorkspace(WORKSPACE);
    });

    it(`opens a ${count}-material catalog within ${openBudgetMs}ms`, async () => {
      expect(index.count).toBe(total);

      recordPerf({
        surface: "seed-write",
        cardinality: total,
        peers: 1,
        metric: "ms",
        value: seedMs,
      });
      // Everything after the fixture write: window IPC + Redux + grid render.
      // Flat across tiers is the property — a page is a page.
      expectWithinBudget(
        {
          surface: "window-open",
          cardinality: total,
          peers: 1,
          metric: "ms",
          value: totalMs - seedMs,
        },
        openBudgetMs,
      );

      // The window is a *window*: the grid shows a page, not the catalog.
      const view = await viewRows(page!);
      expect(view).toBeGreaterThan(0);
      expect(view).toBeLessThan(total);
    }, 120_000);

    it(`searches ${count} materials down to 1 within ${searchBudgetMs}ms`, async () => {
      const { ms } = await measure(async () => {
        await searchMaterialsTool.execute({ query: PROBE_TOKENS.search });
        await page!.waitForSelector(`${VIEWPORT}[data-material-count="1"]`);
      });

      expectWithinBudget(
        { surface: "search", cardinality: total, peers: 1, metric: "ms", value: ms },
        searchBudgetMs,
      );

      await searchMaterialsTool.execute({ query: "" });
      await page!.waitForSelector(`${VIEWPORT}[data-material-count="${total}"]`);
    }, 120_000);

    it(`pages in ${PAGE_SAMPLES} pages, p95 within ${pageInBudgetMs}ms`, async () => {
      const samples: number[] = [];
      for (let i = 0; i < PAGE_SAMPLES; i++) {
        const before = await viewRows(page!);
        const button = await page!.$(LOAD_MORE);
        if (!button) break; // nothing left to page in
        const { ms } = await measure(async () => {
          await button.click();
          // The page has landed when the mirror grew — a single selector
          // wait on the count mirror, not a snapshot scan (§11.4).
          await page!.waitForFunction(
            /* istanbul ignore next */
            (sel: string, prev: number) => {
              const el = document.querySelector(sel) as HTMLElement | null;
              return Number(el?.dataset.materialView ?? "0") > prev;
            },
            {},
            VIEWPORT,
            before,
          );
        });
        samples.push(ms);
      }

      expect(samples.length).toBeGreaterThan(0);
      expectWithinBudget(
        {
          surface: "page-in",
          cardinality: total,
          peers: 1,
          metric: "ms",
          value: samples[samples.length - 1],
          p50: percentile(samples, 50),
          p95: percentile(samples, 95),
        },
        pageInBudgetMs,
      );
    }, 180_000);

    it(`scrolls a ${count}-material view within ${scrollBudgetMs}ms`, async () => {
      await page!.waitForSelector(SCROLLER);
      const box = await (await page!.$(SCROLLER))!.boundingBox();
      if (!box) throw new Error("virtual scroller has no box");
      await page!.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      const { ms } = await measure(async () => {
        for (let i = 0; i < SCROLL_STEPS; i++) {
          await page!.mouse.wheel({ deltaY: 800 });
          await rafTick(page!); // wait a paint, not a fixed duration
        }
      });

      const scrolledTop = await page!.evaluate(
        /* istanbul ignore next */
        (sel: string) => {
          const el = document.querySelector(sel) as HTMLElement | null;
          return el?.scrollTop ?? 0;
        },
        SCROLLER,
      );
      expect(scrolledTop).toBeGreaterThan(0);

      expectWithinBudget(
        { surface: "scroll-sweep", cardinality: total, peers: 1, metric: "ms", value: ms },
        scrollBudgetMs,
      );
    }, 120_000);

    it(`keeps at most ${residentBudget} rows resident after browsing ${count}`, async () => {
      // Shorten the grace period so the sweep's effect is observable inside a
      // test. The rule is TTL-independent; only the wait is not.
      await dispatch(
        page!,
        configureMaterialsResidency({
          ttlMs: TEST_TTL_MS,
          sweepIntervalMs: TEST_TTL_MS,
        }) as never,
      );

      const beforeSearch = await residentRows(page!);
      recordPerf({
        surface: "mirror-browsed",
        cardinality: total,
        peers: 1,
        unit: "materials",
        metric: "rows",
        value: beforeSearch,
      });

      // A search replaces the view. The pages the user browsed through are
      // now referenced by nothing — this is the moment the mirror is
      // supposed to hand memory back.
      await searchMaterialsTool.execute({ query: PROBE_TOKENS.search });
      await page!.waitForSelector(`${VIEWPORT}[data-material-count="1"]`);

      const { ms } = await measure(async () => {
        await page!.waitForFunction(
          /* istanbul ignore next */
          (budget: number) => {
            const store = (
              globalThis as unknown as {
                __klippelStore__?: { getState: () => any };
              }
            ).__klippelStore__;
            const held = store
              ? Object.keys(store.getState().Materials?.materials ?? {}).length
              : Number.MAX_SAFE_INTEGER;
            return held <= budget;
          },
          { polling: 250, timeout: 60_000 },
          residentBudget,
        );
      });
      recordPerf({
        surface: "mirror-reclaim",
        cardinality: total,
        peers: 1,
        metric: "ms",
        value: ms,
      });

      // Belt and braces: force one more sweep and assert the settled number,
      // so the recorded value is the bound rather than the first sample that
      // happened to cross it.
      await dispatch(page!, sweepMaterialsResidency() as never);
      const settled = await residentRows(page!);
      expectWithinBudget(
        {
          surface: "mirror-bound",
          cardinality: total,
          peers: 1,
          unit: "materials",
          metric: "rows",
          value: settled,
        },
        residentBudget,
      );

      await searchMaterialsTool.execute({ query: "" });
      await page!.waitForSelector(`${VIEWPORT}[data-material-count="${total}"]`);
    }, 180_000);
  },
);
