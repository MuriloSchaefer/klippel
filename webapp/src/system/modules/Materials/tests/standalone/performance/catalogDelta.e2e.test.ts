/**
 * Performance e2e — catalog **change propagation** under a synthetic catalog.
 *
 * `catalogRender` measures getting N materials on screen. This file measures
 * what happens *after* that: the cost of a catalog mutation arriving from
 * outside the renderer's own Redux flow — the path a peer's edit takes, and the
 * path an xlsx import's chunk writes take.
 *
 * Every mutation here is issued **directly through the main-process IPC**
 * (`window.electron.jazz.materials.*`), deliberately bypassing the renderer's
 * commands. That is what makes this a propagation measurement rather than a
 * write measurement: no optimistic reducer runs, so the only way the grid can
 * change is main → `jazz-materials:changed` → delta fetch → slice → render.
 *
 * Each measurement is **decomposed into write and propagation**, because only
 * the second half is this module's concern:
 *
 *   - `catalog-write*` — the Jazz write round-trip, recorded as context with no
 *     budget. It grows with catalog size for reasons that live in the Jazz
 *     layer (`requireCatalog` resolve, record size), not in the delta path.
 *   - `delta-*` — from the write resolving to the grid reflecting it. This is
 *     the budgeted surface: fan-out debounce + delta IPC + reducer + render.
 *
 * Surfaces:
 *   - delta-edit   — one field on one row changes; until the grid reflects it.
 *   - delta-add    — a new material appears; until the row count grows.
 *   - delta-delete — a material is removed; until the row count shrinks.
 *   - delta-burst  — `BURST` sequential writes (an import's chunk pattern);
 *                    the *tail* after the last write, i.e. how far behind the
 *                    renderer had fallen. This is the livelock guard: before
 *                    the delta path, a burst whose rebuilds outran the 150 ms
 *                    debounce never drained at all, and the tail was unbounded.
 *
 * Budgets clear a **floor of ~150 ms**: main debounces its change fan-out by
 * that much (`notifyCatalogChange`), so no propagation can beat it.
 *
 * Propagation is **not flat** across tiers — `computeCatalogDelta` reads one
 * signature per catalog entry to find what moved, so it carries an O(catalog)
 * term even though the expensive parts (attribute projection, structured
 * clone, re-derivation) are O(changed). What the budgets guard is that the
 * growth stays far sub-linear: 10× the catalog must not cost 10× the latency,
 * which is exactly what the full-reload path did
 * (docs/analysis/materials-catalog-lag-analysis.md, F2).
 *
 * Waits are pure selector waits on the `data-material-count` mirror (§11.4).
 * The trick that makes an *edit* observable that way: park a live search on a
 * token no row carries, then have the mutation set that token as a row's
 * `externalId` (a search key). The count mirror going 0 → 1 is then proof the
 * edited row reached the renderer, not merely that something ticked.
 *
 * Scope: standalone, ≤ 1k live-IPC tier (`LIVE_SEED_MAX`). The 10k/100k tiers
 * need the materialize-once + `cpSync` base from §11.2, which does not exist
 * yet — see the analysis doc's "Still open".
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
import type { CatalogIndex } from "@helpers/puppeteer/generateMaterialsCatalog";
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

/** Token no generated row carries, used as the live-search needle. */
const DELTA_TOKEN = "__probe_delta__";
/** Writes in the burst surface — an import chunk is 25. */
const BURST = 25;

/**
 * Cardinality tiers + per-surface budgets (ms).
 *
 * Calibrated from a reference run on this repo's dev machine and left with
 * headroom for a loaded CI box; the recorded jsonl trend is the real signal
 * (§11.1). The property they encode: 10× the catalog buys well under 2× the
 * propagation latency. A future run that needs these to scale with `count`
 * means the delta path has regressed toward a full reload.
 */
const TIERS: ReadonlyArray<{
  count: number;
  editBudgetMs: number;
  addBudgetMs: number;
  deleteBudgetMs: number;
  burstTailBudgetMs: number;
}> = [
  { count: 100, editBudgetMs: 700, addBudgetMs: 700, deleteBudgetMs: 700, burstTailBudgetMs: 1_500 },
  { count: 1_000, editBudgetMs: 1_200, addBudgetMs: 1_200, deleteBudgetMs: 1_200, burstTailBudgetMs: 2_500 },
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

const countMirror = (n: number) => `${VIEWPORT}[data-material-count="${n}"]`;

/**
 * Set `externalId` on a row straight through the main-process IPC. No renderer
 * command is dispatched, so nothing updates the slice optimistically — the
 * grid can only change once the delta lands.
 */
const tagViaIpc = (p: Page, id: string, token: string) =>
  p.evaluate(
    /* istanbul ignore next */
    (args) =>
      window.electron.jazz.materials.updateMaterial({
        id: args.id,
        patch: { externalId: args.token },
      }),
    { id, token },
  );

const addViaIpc = (p: Page, id: string, typeVersion: string, token: string) =>
  p.evaluate(
    /* istanbul ignore next */
    (args) =>
      window.electron.jazz.materials.addMaterial({
        typeVersion: args.typeVersion,
        material: {
          id: args.id,
          type: args.typeVersion.split("@")[0],
          externalId: args.token,
          attributes: {},
          stock: { amount: 1, unit: "kg" },
          schemaVersion: args.typeVersion.split("@")[1],
          updatedAt: Date.now(),
        },
      }),
    { id, typeVersion, token },
  );

const deleteViaIpc = (p: Page, id: string) =>
  p.evaluate(
    /* istanbul ignore next */
    (mid) => window.electron.jazz.materials.deleteMaterial(mid),
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
  "Catalog change propagation — $count materials (perf)",
  ({ count, editBudgetMs, addBudgetMs, deleteBudgetMs, burstTailBudgetMs }) => {
    const WORKSPACE = `perf-delta-${count}`;
    const total = count + PROBES;

    let index: CatalogIndex;
    /** Rows already tagged with the token, so counts stay predictable. */
    let tagged = 0;

    beforeAll(async () => {
      await resetWorkspace(page!, WORKSPACE);
      await page!.waitForSelector("#ribbon-menu-tabs");
      await switchToMateriaisTab(page!);
      await openStockViewport(page!);

      expect(count).toBeLessThanOrEqual(LIVE_SEED_MAX);
      const seeded = await seedSyntheticMaterials(page!, {
        count,
        seed: `delta-${count}`,
      });
      index = seeded.index;
    }, 180_000);

    afterAll(() => cleanupWorkspace(WORKSPACE));

    /**
     * Park the live search on the token. Every surface below measures from a
     * state where the grid is already filtered, so the number is propagation,
     * not the search that set the stage.
     */
    const parkSearch = async () => {
      await searchMaterialsTool.execute({ query: DELTA_TOKEN });
      await page!.waitForSelector(countMirror(tagged));
    };

    it(`propagates a single-row edit within ${editBudgetMs}ms`, async () => {
      await parkSearch();

      const write = await measure(() =>
        tagViaIpc(page!, index.probes.edit, DELTA_TOKEN),
      );
      // 0 → 1: the edited row now matches the live filter, which it can only
      // do once the delta reached the renderer.
      const propagate = await measure(() =>
        page!.waitForSelector(countMirror(tagged + 1)),
      );
      tagged += 1;

      recordPerf({
        surface: "catalog-write-edit",
        cardinality: total,
        peers: 1,
        metric: "ms",
        value: write.ms,
      });
      expectWithinBudget(
        { surface: "delta-edit", cardinality: total, peers: 1, metric: "ms", value: propagate.ms },
        editBudgetMs,
      );
    }, 60_000);

    it(`propagates an added row within ${addBudgetMs}ms`, async () => {
      await parkSearch();
      const newId = `mat-${index.seed}-delta-add`;

      const write = await measure(() =>
        addViaIpc(page!, newId, index.types[0], DELTA_TOKEN),
      );
      const propagate = await measure(() =>
        page!.waitForSelector(countMirror(tagged + 1)),
      );
      tagged += 1;

      recordPerf({
        surface: "catalog-write-add",
        cardinality: total,
        peers: 1,
        metric: "ms",
        value: write.ms,
      });
      expectWithinBudget(
        { surface: "delta-add", cardinality: total, peers: 1, metric: "ms", value: propagate.ms },
        addBudgetMs,
      );

      // The row is addressable by id, not merely counted (§11.4).
      const added = await page!.evaluate(
        /* istanbul ignore next */
        (mid) => window.electron.jazz.materials.get(mid),
        newId,
      );
      expect(added?.id).toBe(newId);
    }, 60_000);

    it(`propagates a deleted row within ${deleteBudgetMs}ms`, async () => {
      await parkSearch();
      const doomed = `mat-${index.seed}-delta-add`;

      const write = await measure(() => deleteViaIpc(page!, doomed));
      const propagate = await measure(() =>
        page!.waitForSelector(countMirror(tagged - 1)),
      );
      tagged -= 1;

      recordPerf({
        surface: "catalog-write-delete",
        cardinality: total,
        peers: 1,
        metric: "ms",
        value: write.ms,
      });
      expectWithinBudget(
        { surface: "delta-delete", cardinality: total, peers: 1, metric: "ms", value: propagate.ms },
        deleteBudgetMs,
      );
    }, 60_000);

    it(`drains a ${BURST}-write burst within ${burstTailBudgetMs}ms of the last write`, async () => {
      await parkSearch();
      // Bulk rows, addressed a priori (§11.3) — spread across the catalog so
      // the burst isn't confined to one page of the grid.
      const stride = Math.max(1, Math.floor(count / BURST));
      const targets = Array.from(
        { length: BURST },
        (_, k) => `mat-${index.seed}-${(k * stride) % count}`,
      );

      const writes = await measure(async () => {
        for (const id of targets) {
          // Sequential, not parallel: this mirrors the importer's chunk loop,
          // which is what produced the livelock.
          await tagViaIpc(page!, id, DELTA_TOKEN);
        }
      });
      // The tail: how far behind the renderer was when the writes stopped.
      // Ticks land throughout the burst, so a healthy renderer has already
      // applied most of them and this is roughly one debounce + one delta.
      // A renderer that cannot keep up shows it here, unbounded.
      const tail = await measure(() =>
        page!.waitForSelector(countMirror(tagged + targets.length)),
      );
      tagged += targets.length;

      recordPerf({
        surface: "catalog-write-burst",
        cardinality: total,
        peers: 1,
        metric: "ms",
        value: writes.ms,
      });
      expectWithinBudget(
        { surface: "delta-burst-tail", cardinality: total, peers: 1, metric: "ms", value: tail.ms },
        burstTailBudgetMs,
      );
    }, 120_000);
  },
);
