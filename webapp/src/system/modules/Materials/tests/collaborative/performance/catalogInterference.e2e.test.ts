/**
 * Performance e2e — observer responsiveness under collaborative write load.
 *
 * WHAT THIS ASSERTS
 * -----------------
 * One observer peer (A) shares a workspace with W writer peers. After the
 * catalog is seeded and synced, the writers churn `updateMaterialStock`
 * continuously (a sustained inbound-sync load on A). While that churn
 * runs, A measures two surfaces and both must stay within budget:
 *
 *   - search-under-churn  — A drives the real search UI down to the single
 *                           probe row (mirror == 1) while writes stream in.
 *   - propagation-under-churn — a writer stamps a sentinel stock on the
 *                           edit probe; A waits until its catalog reflects
 *                           it (by-id IPC, O(1)). "updates + list" reaching
 *                           the observer under load.
 *
 * This is the interference question: does the observer's UX hold up while
 * peers write? Parameterized by writer count (the `peers` dimension =
 * writers + 1). Full Electron peers, so small N; scaling needs the
 * headless load pool (peerPool.ts TODO).
 *
 * Runs under the collaborative runner
 * (`npm run test:e2e:collaborative:perf`). Budgets are PLACEHOLDERS (§11.1).
 *
 * The writers pace their loop with an in-page `setTimeout` — that is load
 * generation (a peer writing at a rate), not a test state-wait, so the
 * no-fixed-timeout rule (§3) does not apply to it.
 */
import {
  spawnCollaborativePeers,
  type CollaborativeHarness,
  type Peer,
} from "@helpers/puppeteer/collaborativeHarness";
import {
  openNewWorkspacePanel,
  typeNewWorkspaceName,
  confirmNewWorkspace,
} from "@kernel/modules/Store/components/drivers/newWorkspace.puppeteer";
import {
  openShareWorkspacePanel,
  readShareWorkspaceAttrs,
  confirmShareWorkspace,
} from "@kernel/modules/Store/components/drivers/shareWorkspace.puppeteer";
import {
  openJoinWorkspacePanel,
  fillJoinWorkspaceForm,
  confirmJoinWorkspace,
} from "@kernel/modules/Store/components/drivers/joinWorkspace.puppeteer";
import { clickRibbonTab } from "@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer";
import {
  searchMaterialsViaClick,
  clearMaterialSearchViaClick,
} from "@system/modules/Materials/components/drivers/searchMaterials.click.puppeteer";
import { seedSyntheticMaterials } from "@helpers/puppeteer/seedSyntheticMaterials";
import {
  PROBE_TOKENS,
  type CatalogIndex,
} from "@helpers/puppeteer/generateMaterialsCatalog";
import { expectWithinBudget, measure } from "@helpers/puppeteer/recordPerf";

const COUNT = 100; // bulk materials seeded on the observer.
const WRITE_TARGETS = 20; // distinct materials the writers cycle through.
const OPS_PER_SEC = 5; // per-writer write rate.
const SENTINEL = 987654; // distinctive stock amount for the propagation probe.

const VIEWPORT = '[data-testid="material-stock-viewport"]';

/** writers + budgets (ms). `peers` dimension = writers + 1. Placeholders. */
const TIERS: ReadonlyArray<{
  writers: number;
  searchBudgetMs: number;
  propagationBudgetMs: number;
}> = [
  { writers: 1, searchBudgetMs: 3_000, propagationBudgetMs: 5_000 },
  { writers: 2, searchBudgetMs: 4_000, propagationBudgetMs: 7_000 },
  { writers: 4, searchBudgetMs: 4_000, propagationBudgetMs: 7_000 },
];

const switchToMateriaisTab = async (peer: Peer) => {
  await peer.page.waitForFunction(() => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
    );
    return tabs.some((t) => (t.textContent ?? "").trim() === "Materiais");
  });
  const clicked = await clickRibbonTab(peer.page, undefined, "Materiais");
  if (!clicked) throw new Error("Materiais ribbon tab not found after wait");
  await peer.page.waitForSelector('[data-testid="open-material-stock"]');
};

const openStockViewport = async (peer: Peer) => {
  await peer.page.click('[data-testid="open-material-stock"]');
  await peer.page.waitForSelector(VIEWPORT);
};

/**
 * Wait until a peer's catalog has converged. Resolves the planted probe
 * by id (O(1), §11.4) instead of cloning the whole snapshot — the probe
 * is seeded last, so its arrival is a sound "fully synced" signal and the
 * writers' bulk targets are present by then.
 */
const waitConverged = (peer: Peer, probeId: string) =>
  peer.page.waitForFunction(
    /* istanbul ignore next */
    async (id: string) => {
      const m = await window.electron.jazz.materials.get(id);
      return Boolean(m) && m!.id === id;
    },
    {},
    probeId,
  );

/** Start a paced write loop on a peer; resolves with the write count on stop. */
const startWriteLoad = (peer: Peer, ids: string[], opsPerSec: number) =>
  peer.page.evaluate(
    /* istanbul ignore next */
    async (targetIds: string[], ops: number) => {
      const w = window as unknown as { __perfStop?: boolean };
      w.__perfStop = false;
      const interval = 1000 / ops;
      let n = 0;
      while (!w.__perfStop) {
        const id = targetIds[n % targetIds.length];
        try {
          await window.electron.jazz.materials.updateMaterialStock({
            id,
            stock: { amount: n % 1000, unit: "kg" },
          });
        } catch {
          /* ignore transient write rejections */
        }
        n += 1;
        await new Promise((r) => setTimeout(r, interval));
      }
      return n;
    },
    ids,
    opsPerSec,
  );

const stopWriteLoad = (peer: Peer) =>
  peer.page.evaluate(() => {
    (window as unknown as { __perfStop?: boolean }).__perfStop = true;
  });

describe.each(TIERS)(
  "Observer under $writers writer(s) (perf)",
  ({ writers, searchBudgetMs, propagationBudgetMs }) => {
    const peers = writers + 1;
    let harness: CollaborativeHarness | null = null;
    let observer: Peer;
    let writerPeers: Peer[] = [];
    let index: CatalogIndex;
    const SHARED_WS = `perf-churn-${peers}p-${Math.floor(Math.random() * 1e6)}`;

    beforeAll(async () => {
      harness = await spawnCollaborativePeers({
        count: peers,
        namePrefix: `perf-churn-${peers}p-${Date.now()}`,
        debug: process.env.KLIPPEL_DEV_LOG === "1",
      });
      [observer, ...writerPeers] = harness.peers;

      await openNewWorkspacePanel(observer.page);
      await typeNewWorkspaceName(observer.page, SHARED_WS);
      await confirmNewWorkspace(observer.page);
      await openShareWorkspacePanel(observer.page);
      const attrs = await readShareWorkspaceAttrs(observer.page);
      expect(attrs.coId).toMatch(/^co_/);
      await confirmShareWorkspace(observer.page);

      for (const [i, peer] of writerPeers.entries()) {
        await openJoinWorkspacePanel(peer.page);
        await fillJoinWorkspaceForm(peer.page, {
          coId: attrs.coId,
          syncUrl: attrs.syncUrl,
          name: `joined-${SHARED_WS}-${i}`,
        });
        await confirmJoinWorkspace(peer.page);
      }

      await switchToMateriaisTab(observer);
      await openStockViewport(observer);

      const seeded = await seedSyntheticMaterials(observer.page, {
        count: COUNT,
        seed: `churn-${peers}`,
      });
      index = seeded.index;

      // Writers must have the catalog before they can mutate it.
      await Promise.all(
        writerPeers.map((p) => waitConverged(p, index.probes.search)),
      );
    }, 240_000);

    afterAll(async () => {
      if (harness) await harness.teardown();
    });

    it(`keeps search < ${searchBudgetMs}ms and propagation < ${propagationBudgetMs}ms under ${writers} writer(s)`, async () => {
      const churnTargets = Array.from(
        { length: WRITE_TARGETS },
        (_, i) => `mat-${index.seed}-${i}`,
      );

      // Start the sustained write churn on every writer.
      const loads = writerPeers.map((p) =>
        startWriteLoad(p, churnTargets, OPS_PER_SEC),
      );

      try {
        // search-under-churn: observer drives the real search UI to 1 row.
        const search = await measure(async () => {
          await searchMaterialsViaClick(observer.page, PROBE_TOKENS.search);
          await observer.page.waitForSelector(`${VIEWPORT}[data-material-count="1"]`);
        });
        expectWithinBudget(
          { surface: "search-under-churn", cardinality: index.count, peers, metric: "ms", value: search.ms },
          searchBudgetMs,
        );
        await clearMaterialSearchViaClick(observer.page);
        await observer.page.waitForSelector(`${VIEWPORT}[data-material-count="${index.count}"]`);

        // propagation-under-churn: a writer stamps a sentinel on the edit
        // probe; measure until the observer's catalog reflects it.
        const propagation = await measure(async () => {
          await writerPeers[0].page.evaluate(
            (id, amount) =>
              window.electron.jazz.materials.updateMaterialStock({
                id,
                stock: { amount, unit: "kg" },
              }),
            index.probes.edit,
            SENTINEL,
          );
          await observer.page.waitForFunction(
            async (id: string, amount: number) => {
              const m = await window.electron.jazz.materials.get(id);
              return Boolean(m) && m!.stock?.amount === amount;
            },
            {},
            index.probes.edit,
            SENTINEL,
          );
        });
        expectWithinBudget(
          { surface: "propagation-under-churn", cardinality: index.count, peers, metric: "ms", value: propagation.ms },
          propagationBudgetMs,
        );
      } finally {
        await Promise.all(writerPeers.map((p) => stopWriteLoad(p)));
        await Promise.all(loads);
      }
    }, 240_000);
  },
);
