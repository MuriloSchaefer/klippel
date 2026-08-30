/**
 * E2E integrity test for **catalog pagination**.
 *
 * The renderer no longer mirrors the whole materials catalog. It mirrors a
 * window: the rows open models reference, plus a page of the most-used ones,
 * extended as the user searches or pages in
 * (`docs/changes/2026-08-11-3b71c2-catalog-windowed-reads.md`). That turns
 * "what is in Redux" from a fact into an invariant, and this file pins it.
 *
 * `integrity` rather than `functionality` because what is under test is a set
 * of relationships that must hold no matter which path produced the state —
 * cold open, a page, a search, a pin from an open model:
 *
 *   1. **The mirror is a proper subset.** Resident rows < catalog rows, while
 *      the catalog-wide count stays correct. If this fails, windowing is not
 *      happening at all and every other assertion here passes vacuously.
 *   2. **Paging is a partition.** Walking every page yields each material
 *      exactly once: no duplicates, no gaps, and the union is the catalog.
 *      This is the invariant a pagination bug actually violates — an
 *      off-by-one in the offset shows up as a repeated or skipped row, never
 *      as a crash.
 *   3. **Search sees past the window.** A row deliberately outside the first
 *      page is findable. This is what distinguishes a server-side search from
 *      a filter over resident rows, and the latter is silently wrong: it
 *      returns a plausible, incomplete answer.
 *   4. **A pin survives a reset.** A material pinned by an open model stays
 *      resident when the window is reloaded from scratch, even though it does
 *      not rank into the first page. Without this, opening a model whose
 *      materials rank poorly would blank its nodes on the next workspace
 *      event.
 *
 * Addressing is a priori throughout (§11.3): the generator derives ids from
 * the row index and plants `__probe_*` rows the dictionary never emits, so
 * every target is computed, never discovered by scanning.
 *
 * **Why the probes are guaranteed to be outside the first page.** With no
 * models in the workspace every material has usage 0, so the ranking falls
 * through to its tiebreak, id ascending. Probe ids end in `probe-search` /
 * `probe-edit` / `probe-delete`; bulk ids end in digits. `'p' > '9'`, so the
 * probes sort last — behind 350 bulk rows, well past the 100-row first page.
 * That is a property of the total order this feature defines, not a
 * coincidence of the fixture, which is why it is safe to build a test on.
 *
 * Skips if CDP unreachable.
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

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const WORKSPACE = "e2e-catalog-pagination";
const VIEWPORT = '[data-testid="material-stock-viewport"]';
const LOAD_MORE = '[data-testid="material-stock-load-more"]';

/**
 * Bulk rows. Chosen to be several pages deep (3.5 × the 100-row window) while
 * staying inside the live-seed tier, so paging is exercised across a boundary
 * that is neither the first nor the last page.
 */
const BULK = 350;
/** The generator plants three probe rows beyond `BULK`. */
const PROBES = 3;
const TOTAL = BULK + PROBES;
/** `DEFAULT_WINDOW_LIMIT` in `Materials/main/materials.ts`. */
const PAGE_SIZE = 100;

const SEED = "pagination-integrity";

let browser: Browser | null = null;
let page: Page | null = null;
let index: CatalogIndex;

// ---- store reads -----------------------------------------------------
//
// The window slice has no DOM mirror for its id *list* — only for its counts
// — and the partition assertion is about the list. Reading the store is the
// documented escape hatch for state with no rendered surface (§11.6); the
// counts it cross-checks against are asserted through the DOM mirrors.

interface WindowProbe {
  /** Ids in the current view, in server rank order. */
  resultIds: string[];
  /** Every material id resident in Redux — the view plus pins. */
  residentIds: string[];
  total: number;
  matched: number;
  hasMore: boolean;
  query: string;
}

const readWindow = (p: Page): Promise<WindowProbe> =>
  p.evaluate(
    /* istanbul ignore next */
    () => {
      const store = (
        globalThis as unknown as {
          __klippelStore__?: { getState: () => any };
        }
      ).__klippelStore__;
      if (!store) throw new Error("readWindow: __klippelStore__ not exposed");
      const materials = store.getState().Materials;
      const window = materials.window;
      return {
        resultIds: [...window.resultIds],
        residentIds: Object.keys(materials.materials ?? {}),
        total: window.total,
        matched: window.matched,
        hasMore: window.hasMore,
        query: window.query,
      };
    },
  );

/**
 * Dispatch a Materials command through the live store.
 *
 * Used for the pin surface, which has no UI of its own — pinning is a
 * consequence of opening a model, and driving Composer end to end here would
 * make this file a test of Composer's model editor rather than of the
 * catalog's paging contract. The command is the seam the pin contract lives
 * at, so it is the seam asserted.
 */
const dispatchMaterials = (p: Page, type: string, payload: unknown) =>
  p.evaluate(
    /* istanbul ignore next */
    (args) => {
      const store = (
        globalThis as unknown as {
          __klippelStore__?: { dispatch: (a: unknown) => unknown };
        }
      ).__klippelStore__;
      if (!store)
        throw new Error("dispatchMaterials: __klippelStore__ not exposed");
      return store.dispatch({ type: args.type, payload: args.payload });
    },
    { type, payload },
  );

const ACTIONS = {
  ensureLoaded: "[Materials:Materials:Command] Ensure materials loaded",
  loadWindow: "[Materials:Materials:Command] Load materials window",
} as const;

// ---- navigation ------------------------------------------------------

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

/** Type into the stock search box and wait for main's answer to land. */
const search = async (p: Page, query: string, expectedMatches: number) => {
  const input = await p.waitForSelector('[data-testid="material-stock-search"] input');
  await input!.click();
  await p.keyboard.down("Control");
  await p.keyboard.press("a");
  await p.keyboard.up("Control");
  await p.keyboard.press("Delete");
  if (query) await p.type('[data-testid="material-stock-search"] input', query);
  // The count mirror is the catalog-wide match count, so this waits for the
  // *server's* answer rather than for a local re-render.
  await p.waitForSelector(`${VIEWPORT}[data-material-count="${expectedMatches}"]`);
};

/** Restore the browse view and a fresh first page. */
const resetToFirstPage = async (p: Page) => {
  await search(p, "", TOTAL);
  await dispatchMaterials(p, ACTIONS.loadWindow, undefined);
  await p.waitForSelector(`${VIEWPORT}[data-material-view="${PAGE_SIZE}"]`);
};

beforeAll(async () => {
  browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith("http://localhost:")) ?? pages[0];
  if (!page) throw new Error("No renderer page found in Electron");

  await resetWorkspace(page, WORKSPACE);
  await page.waitForSelector("#ribbon-menu-tabs");
  await switchToMateriaisTab(page);
  await openStockViewport(page);

  ({ index } = await seedSyntheticMaterials(page, { count: BULK, seed: SEED }));
  expect(index.count).toBe(TOTAL);
}, 180_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(WORKSPACE);
});

beforeEach(async () => {
  await resetUIState(page!);
  await resetToFirstPage(page!);
});

describe("catalog pagination", () => {
  it("mirrors a page of the catalog, not the catalog", async () => {
    const p = page!;

    // Catalog-wide counts are correct...
    await p.waitForSelector(`${VIEWPORT}[data-material-count="${TOTAL}"]`);
    await p.waitForSelector(`${VIEWPORT}[data-material-total="${TOTAL}"]`);
    // ...while only a page is resident, and the UI says there is more.
    await p.waitForSelector(`${VIEWPORT}[data-material-view="${PAGE_SIZE}"]`);
    await p.waitForSelector(`${VIEWPORT}[data-material-has-more="true"]`);

    const state = await readWindow(p);
    expect(state.total).toBe(TOTAL);
    expect(state.matched).toBe(TOTAL);
    expect(state.resultIds).toHaveLength(PAGE_SIZE);
    // The whole point: Redux holds a fraction of the catalog. Asserted as a
    // strict inequality rather than an exact number so a future change to the
    // page size does not falsify the invariant it is meant to protect.
    expect(state.residentIds.length).toBeLessThan(TOTAL);
  });

  it("pages through the whole catalog exactly once — no gaps, no repeats", async () => {
    const p = page!;

    // Walk every page via the explicit affordance. The button disappears when
    // `hasMore` goes false, which is the loop's own termination condition —
    // no fixed iteration count, so a paging bug that stalls fails as a
    // timeout rather than passing on a short read.
    let pagesLoaded = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const more = await p.$(LOAD_MORE);
      if (!more) break;
      const before = (await readWindow(p)).resultIds.length;
      await more.click();
      await p.waitForFunction(
        /* istanbul ignore next */
        (args: { selector: string; before: number }) => {
          const el = document.querySelector(args.selector);
          const view = Number(el?.getAttribute("data-material-view") ?? "0");
          return view > args.before;
        },
        {},
        { selector: VIEWPORT, before },
      );
      pagesLoaded += 1;
      // A guard against a bug that appends without advancing the offset,
      // which would otherwise spin until the suite timeout with no diagnosis.
      expect(pagesLoaded).toBeLessThanOrEqual(Math.ceil(TOTAL / PAGE_SIZE) + 1);
    }

    await p.waitForSelector(`${VIEWPORT}[data-material-has-more="false"]`);
    const state = await readWindow(p);

    // The partition, stated three ways:
    //   size          — every material was delivered;
    //   set size      — none was delivered twice;
    //   probe membership — the specific rows we know sort last did arrive,
    //                      so "every material" is not satisfied by 353 copies
    //                      of the first page.
    expect(state.resultIds).toHaveLength(TOTAL);
    expect(new Set(state.resultIds).size).toBe(TOTAL);
    for (const id of [
      index.firstId,
      index.lastId,
      ...index.sampleIds,
      index.probes.search,
      index.probes.edit,
      index.probes.delete,
    ]) {
      expect(state.resultIds).toContain(id);
    }
    expect(state.hasMore).toBe(false);
  });

  it("finds a material that is outside the loaded window", async () => {
    const p = page!;

    // Precondition — and the assertion that gives this test its teeth. If the
    // probe were already resident, a local filter would find it too and the
    // test would pass without proving anything about where search runs.
    const before = await readWindow(p);
    expect(before.residentIds).not.toContain(index.probes.search);

    await search(p, PROBE_TOKENS.search, 1);

    const after = await readWindow(p);
    expect(after.matched).toBe(1);
    expect(after.resultIds).toEqual([index.probes.search]);
    // The row itself came back, not just its count.
    expect(after.residentIds).toContain(index.probes.search);

    // Clearing restores the browse view's first page rather than leaving the
    // mirror stuck on the one search hit.
    await search(p, "", TOTAL);
    const cleared = await readWindow(p);
    expect(cleared.matched).toBe(TOTAL);
    expect(cleared.resultIds).toHaveLength(PAGE_SIZE);
  });

  it("keeps a pinned material resident across a window reset", async () => {
    const p = page!;
    const pinned = index.probes.edit;

    const before = await readWindow(p);
    expect(before.residentIds).not.toContain(pinned);

    // What opening a model does: pin the materials its nodes reference, under
    // an owner that can later let go. The owner is not optional — an ownerless
    // `ensureMaterialsLoaded` resolves the row but does **not** pin it, because
    // nothing would ever release it (catalog-mirror.md §3, invariant 8.3). The
    // second half of this test is that rule.
    await dispatchMaterials(p, ACTIONS.ensureLoaded, {
      ids: [pinned],
      owner: "test-model",
    });
    await p.waitForFunction(
      /* istanbul ignore next */
      (id: string) => {
        const store = (
          globalThis as unknown as { __klippelStore__?: { getState: () => any } }
        ).__klippelStore__;
        return Boolean(store?.getState().Materials.materials?.[id]);
      },
      {},
      pinned,
    );

    // Reload the window from scratch — the cold-open / workspace-switch path,
    // which replaces the mirror rather than extending it.
    await dispatchMaterials(p, ACTIONS.loadWindow, undefined);
    await p.waitForSelector(`${VIEWPORT}[data-material-view="${PAGE_SIZE}"]`);

    const after = await readWindow(p);
    // Survived the reset despite ranking last: this is the pin doing its job,
    // not the row having drifted into the first page.
    expect(after.residentIds).toContain(pinned);
    expect(after.resultIds).not.toContain(pinned);
    expect(after.resultIds).toHaveLength(PAGE_SIZE);
  });

  it("drops an ownerless resolve on the next window reset", async () => {
    const p = page!;
    const resolved = index.probes.delete;

    // Reading resolves; it does not retain. Without an owner there is nobody
    // to release the claim, so the mirror would only ever grow — the row is
    // fetched, rendered, and then let go at the next reset.
    await dispatchMaterials(p, ACTIONS.ensureLoaded, { ids: [resolved] });
    await p.waitForFunction(
      /* istanbul ignore next */
      (id: string) => {
        const store = (
          globalThis as unknown as { __klippelStore__?: { getState: () => any } }
        ).__klippelStore__;
        return Boolean(store?.getState().Materials.materials?.[id]);
      },
      {},
      resolved,
    );

    await dispatchMaterials(p, ACTIONS.loadWindow, undefined);
    await p.waitForSelector(`${VIEWPORT}[data-material-view="${PAGE_SIZE}"]`);

    const after = await readWindow(p);
    expect(after.residentIds).not.toContain(resolved);
  });
});
