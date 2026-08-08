/**
 * Performance e2e — how many budgets and how many items per budget the system
 * holds and manipulates (e2e-tests.md §11).
 *
 * Three groups of surfaces, each on its own cardinality axis:
 *
 *   A. budget cardinality — `create` (N `createBudget` dispatches: reducer +
 *      middleware + re-render, all in memory), `session-save` (the whole-session
 *      save — the *only* write path, one file per budget plus the reconciling
 *      prune) and `selector-open` (the BudgetSelector renders every budget as
 *      an option, so it degrades first as budgets accumulate).
 *   B. items per budget   — `items-render` (the belongs branch renders M item
 *      rows) and `item-add` (one more item on top of M, re-rendered at size).
 *   C. rehydrate          — M budget JSON files on disk → workspace switch →
 *      store holds them. The cold path: one `readFile` per budget.
 *
 * Note that only `session-save` touches disk. Budget mutations are in-memory by
 * design — session data is a point-in-time snapshot (§12) — so `create` and
 * `item-add` measure state + render, not I/O.
 *
 * Seeding follows the tier rules (§11.2): store dispatch up to
 * `LIVE_DISPATCH_MAX`; beyond that, and for the rehydrate surface, budgets are
 * written to disk out of band.
 *
 * Targets are derived, never discovered (§11.3): the generator's labels are
 * index-derived (`Orçamento {i}`) and it plants a uniquely-labelled probe
 * budget the naming never emits, which is what the selector test waits on.
 *
 * Each `it` prints one `[perf] …` line and appends a record to
 * `.tests-executions/perf-results.jsonl` for trending (§11.1).
 *
 * Budgets below are ~2.5x the first reference run (hardware in the artifact);
 * re-calibrate before trusting them elsewhere. That run says:
 *
 *   surface                100      500     1000/2000
 *   budget-create          103ms    553ms   —
 *   budget-session-save    449ms    602ms   —
 *   budget-selector-open   434ms   1575ms   —
 *   budget-items-render    487ms   2017ms   4024ms
 *   budget-item-add        267ms    674ms   1265ms
 *   budget-rehydrate        68ms    150ms    575ms (@2000)
 *
 * Reading: I/O is not the bottleneck at these sizes — 500 budgets save in
 * ~0.6 s and 2 000 rehydrate in ~0.6 s. The cost is *render*: `items-render`
 * grows roughly linearly but steeply, because a budget renders every line at
 * once with no virtualization.
 *
 * These numbers replaced an earlier baseline where every budget mutation wrote
 * its own file. Moving to snapshot-only persistence (§12) took `budget-create`
 * at 500 from 829 ms to 553 ms and `items-render` at 1 000 from 6.0 s to 4.0 s
 * — the per-mutation writes were about a third of the cost, and they bought
 * nothing a session save does not.
 *
 * This surface has already earned its keep: adding the amount + total-cost
 * columns first shipped a MUI `TextField` per row, which took
 * `budget-items-render` to 29.7 s at 1 000 items — a 6x regression no
 * functionality test would have noticed. The row was rebuilt on a native
 * `input` with `React.memo` and no ripple. If these tiers ever become
 * realistic, virtualize the list.
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import {
  cleanupWorkspace,
  resetWorkspace,
} from "@helpers/puppeteer/resetWorkspace";
import { resetUIState } from "@helpers/puppeteer/closeOverlays";
import {
  addItemsViaStore,
  clearBudgets,
  countBudgets,
  seedBudgetsToDisk,
  seedBudgetsViaStore,
  switchWorkspaceLive,
  waitForBudgetCountInStore,
  LIVE_DISPATCH_MAX,
} from "@helpers/puppeteer/seedSyntheticBudgets";
import {
  generateBudgetsCatalog,
  BUDGET_PROBE_TOKENS,
} from "@helpers/puppeteer/generateBudgetsCatalog";
import { expectWithinBudget, measure } from "@helpers/puppeteer/recordPerf";
import { saveSessionViaUI } from "@kernel/modules/Store/components/drivers/SessionAutoSaver.click.puppeteer";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const ROOT = '[data-testid="budget-accordion"]';
const ACCORDION = "Orçamento";

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock("../../../../../../../electron/main/mcp/puppeteer", () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { createBudgetTool } from "@system/modules/Orders/mcpTools/createBudget";
import { createModelTool } from "@system/modules/Composer/mcpTools/createModel";
import { openModelTool } from "@system/modules/Composer/mcpTools/openModel";
import { switchRibbonTabTool } from "@kernel/modules/Layout/mcpTools/switchRibbonTab";
import { expandAccordionTool } from "@kernel/modules/Layout/mcpTools/expandAccordion";

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const budgetCountSel = (n: number) => `${ROOT}[data-budget-count="${n}"]`;
const itemCountSel = (n: number) => `${ROOT}[data-budget-item-count="${n}"]`;

/** Bring a fresh model up in its own viewport with the accordion expanded. */
const openModelWithAccordion = async (name: string) => {
  await createModelTool.execute({ name, id: `perf-${uniqueSuffix()}` });
  await page!.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
  await openModelTool.execute({ modelName: name });
  await expandAccordionTool.execute({ name: ACCORDION });
};

const enterComposer = async () => {
  await page!.waitForSelector("#ribbon-menu-tabs");
  await switchRibbonTabTool.execute({ label: "Compositor" });
  await page!.waitForSelector('[aria-label="create-model"]');
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

// ---------------------------------------------------------------------------
// A. Budget cardinality — how many budgets the system holds and offers.
// ---------------------------------------------------------------------------

const BUDGET_TIERS: ReadonlyArray<{
  count: number;
  createBudgetMs: number;
  saveBudgetMs: number;
  selectorBudgetMs: number;
}> = [
  { count: 100, createBudgetMs: 300, saveBudgetMs: 1_200, selectorBudgetMs: 1_100 },
  { count: 500, createBudgetMs: 1_400, saveBudgetMs: 1_800, selectorBudgetMs: 4_000 },
];

describe.each(BUDGET_TIERS)(
  "budgets — $count budgets (perf)",
  ({ count, createBudgetMs, saveBudgetMs, selectorBudgetMs }) => {
    const WORKSPACE = `perf-budgets-${count}`;
    // The generator plants one probe budget beyond `count`.
    const total = count + 1;

    beforeAll(async () => {
      await resetWorkspace(page!, WORKSPACE);
      await enterComposer();
      await openModelWithAccordion(`Perf Budgets ${count}`);
      await clearBudgets(page!);
    }, 180_000);

    afterAll(() => cleanupWorkspace(WORKSPACE));

    it(`creates ${count} budgets within ${createBudgetMs}ms`, async () => {
      expect(count).toBeLessThanOrEqual(LIVE_DISPATCH_MAX);
      const catalog = generateBudgetsCatalog({
        count,
        seed: `budgets-${count}`,
      });
      expect(catalog.index.count).toBe(total);

      // Reducer + middleware + re-render, no I/O — budgets reach disk only on
      // a session save, measured separately below.
      const { ms } = await measure(async () => {
        await seedBudgetsViaStore(page!, catalog);
        await page!.waitForSelector(budgetCountSel(total));
      });

      expectWithinBudget(
        {
          surface: "budget-create",
          cardinality: total,
          unit: "budgets",
          peers: 1,
          metric: "ms",
          value: ms,
        },
        createBudgetMs,
      );

      expect(await countBudgets(page!)).toBe(total);
    }, 180_000);

    it(`saves a session of ${count} budgets within ${saveBudgetMs}ms`, async () => {
      await page!.waitForSelector(budgetCountSel(total));

      // Since budgets no longer persist per mutation, the whole-session save is
      // *the* write path — one file per budget, plus the reconciling prune.
      // Driven through the real control, like any other session save.
      const { ms } = await measure(() => saveSessionViaUI(page!));

      expectWithinBudget(
        {
          surface: "budget-session-save",
          cardinality: total,
          unit: "budgets",
          peers: 1,
          metric: "ms",
          value: ms,
        },
        saveBudgetMs,
      );
    }, 180_000);

    it(`opens the budget selector over ${count} budgets within ${selectorBudgetMs}ms`, async () => {
      // The previous `it` left the catalog in place; the selector renders one
      // MenuItem per budget, so this measures option-list construction at size.
      await page!.waitForSelector(budgetCountSel(total));

      const { ms } = await measure(async () => {
        await page!.click('[data-testid="add-to-budget"]');
        await page!.waitForSelector(
          '[role="pointer-panel-content"] [data-testid="add-to-budget-form"]',
        );
        await page!.click(
          '[data-testid="budget-selector"] [role="combobox"]',
        );
        // Derived target (§11.3): the planted probe is unique by construction
        // and is the last option, so seeing it means the list is fully built.
        await page!.waitForSelector(
          `[role="option"][data-budget-option-label="${BUDGET_PROBE_TOKENS.budget}"]`,
        );
      });

      expectWithinBudget(
        {
          surface: "budget-selector-open",
          cardinality: total,
          unit: "budgets",
          peers: 1,
          metric: "ms",
          value: ms,
        },
        selectorBudgetMs,
      );

      const options = await page!.$$eval(
        '[role="option"]',
        (els) => els.length,
      );
      expect(options).toBe(total);
    }, 180_000);
  },
);

// ---------------------------------------------------------------------------
// B. Items per budget — how large a single budget gets before it stops
//    rendering and mutating acceptably.
// ---------------------------------------------------------------------------

const ITEM_TIERS: ReadonlyArray<{
  items: number;
  renderBudgetMs: number;
  addBudgetMs: number;
}> = [
  { items: 100, renderBudgetMs: 1_200, addBudgetMs: 700 },
  { items: 500, renderBudgetMs: 5_000, addBudgetMs: 1_700 },
  { items: 1_000, renderBudgetMs: 10_000, addBudgetMs: 3_000 },
];

describe.each(ITEM_TIERS)(
  "budget items — $items items in one budget (perf)",
  ({ items, renderBudgetMs, addBudgetMs }) => {
    const WORKSPACE = `perf-budget-items-${items}`;
    const label = `perf-items-${items}`;
    // The real budget starts with the open model as its first item.
    const seeded = items + 1;

    beforeAll(async () => {
      await resetWorkspace(page!, WORKSPACE);
      await enterComposer();
      await openModelWithAccordion(`Perf Items ${items}`);
      await clearBudgets(page!);
      // Create through the UI so the viewport is genuinely linked to item 1 —
      // the belongs branch is what we are about to measure.
      await createBudgetTool.execute({ label });
      await page!.waitForSelector(itemCountSel(1));
    }, 180_000);

    afterAll(() => cleanupWorkspace(WORKSPACE));

    it(`renders a budget of ${items} items within ${renderBudgetMs}ms`, async () => {
      const catalog = generateBudgetsCatalog({
        count: 1,
        itemsPerBudget: items,
        seed: `items-${items}`,
      });
      const bulk = catalog.budgets[0].items;
      const budgetId = await page!.$eval(ROOT, (el) =>
        (el as HTMLElement).dataset.budgetId ?? "",
      );
      expect(budgetId).not.toBe("");

      const { ms } = await measure(async () => {
        await addItemsViaStore(page!, budgetId, bulk);
        await page!.waitForSelector(itemCountSel(seeded));
      });

      expectWithinBudget(
        {
          surface: "budget-items-render",
          cardinality: seeded,
          unit: "items",
          peers: 1,
          metric: "ms",
          value: ms,
        },
        renderBudgetMs,
      );

      const rows = await page!.$$eval(
        '[data-testid="budget-item"]',
        (els) => els.length,
      );
      expect(rows).toBe(seeded);
    }, 180_000);

    it(`adds one more item to a ${items}-item budget within ${addBudgetMs}ms`, async () => {
      await page!.waitForSelector(itemCountSel(seeded));
      const budgetId = await page!.$eval(ROOT, (el) =>
        (el as HTMLElement).dataset.budgetId ?? "",
      );
      const extra = generateBudgetsCatalog({
        count: 1,
        itemsPerBudget: 1,
        seed: `items-${items}-extra`,
      }).budgets[0].items;

      // Incremental cost at size: reducer spread over the item map + one
      // persist write of the whole budget + re-render of the row list.
      const { ms } = await measure(async () => {
        await addItemsViaStore(page!, budgetId, extra);
        await page!.waitForSelector(itemCountSel(seeded + 1));
      });

      expectWithinBudget(
        {
          surface: "budget-item-add",
          cardinality: seeded + 1,
          unit: "items",
          peers: 1,
          metric: "ms",
          value: ms,
        },
        addBudgetMs,
      );
    }, 180_000);
  },
);

// ---------------------------------------------------------------------------
// C. Rehydrate — the cold path: N budget files read on workspace switch.
// ---------------------------------------------------------------------------

const REHYDRATE_TIERS: ReadonlyArray<{ count: number; budgetMs: number }> = [
  { count: 100, budgetMs: 400 },
  { count: 500, budgetMs: 600 },
  { count: 2_000, budgetMs: 1_800 },
];

describe.each(REHYDRATE_TIERS)(
  "budgets — rehydrating $count budgets (perf)",
  ({ count, budgetMs }) => {
    const WORKSPACE = `perf-budget-rehydrate-${count}`;
    const total = count + 1;

    afterAll(() => {
      cleanupWorkspace(WORKSPACE);
      cleanupWorkspace(`${WORKSPACE}-origin`);
    });

    it(`rehydrates ${count} budgets within ${budgetMs}ms`, async () => {
      const catalog = generateBudgetsCatalog({
        count,
        seed: `rehydrate-${count}`,
      });

      // Park the app somewhere else first, so the switch under measurement is
      // a real cross-workspace rehydrate rather than a no-op.
      await resetWorkspace(page!, `${WORKSPACE}-origin`);
      // Out-of-band seed (§11.2): writing the session files directly keeps the
      // write cost out of the measurement, which is about the read path.
      // `switchWorkspaceLive`, not `softResetWorkspace` — the latter wipes the
      // target directory before switching, which would delete this seed.
      seedBudgetsToDisk(WORKSPACE, catalog);

      const { ms } = await measure(async () => {
        // Switching workspaces runs every registered rehydrator, including the
        // budgets slice's — one readFile per budget.
        await switchWorkspaceLive(page!, WORKSPACE);
        await waitForBudgetCountInStore(page!, total);
      });

      expectWithinBudget(
        {
          surface: "budget-rehydrate",
          cardinality: total,
          unit: "budgets",
          peers: 1,
          metric: "ms",
          value: ms,
        },
        budgetMs,
      );
    }, 300_000);
  },
);
