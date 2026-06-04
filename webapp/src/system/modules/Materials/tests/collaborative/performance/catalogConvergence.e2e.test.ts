/**
 * Performance e2e — collaborative catalog convergence.
 *
 * WHAT THIS ASSERTS
 * -----------------
 * Peer A creates + shares a workspace, the other peers join it, then
 * peer A seeds N synthetic materials. The measured number is the
 * wall-clock from issuing the seed on A until EVERY other peer's
 * main-process catalog reflects the planted `__probe_search__` row
 * (resolved O(1) via the by-id IPC, §11.4) — i.e. seed-write on A +
 * sync fan-out to all peers. It must be within the tier's `budgetMs`.
 *
 * Parameterized by PEER COUNT (the `peers` dimension in the recorded
 * artifact). All peers are full Electron instances here, which caps the
 * count at a handful; scaling to 10/50/100 needs the headless
 * jazz-tools load pool (see analysis/performance-tests.md "Peer scaling"
 * and peerPool.ts) — that is the next slice.
 *
 * Topology: one in-memory cojson sync server (a star/relay), the
 * production-realistic answer past the WebRTC mesh ceiling
 * (jazz-performance.md §2.3).
 *
 * Runs under the collaborative runner (`npm run test:e2e:collaborative:perf`)
 * — it spawns its own peers and must NOT use the shared-app global setup.
 * Budgets are PLACEHOLDERS pending calibration (§11.1).
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
import { seedSyntheticMaterials } from "@helpers/puppeteer/seedSyntheticMaterials";
import { PROBE_TOKENS } from "@helpers/puppeteer/generateMaterialsCatalog";
import {
  expectWithinBudget,
  measure,
  recordPerf,
} from "@helpers/puppeteer/recordPerf";

const COUNT = 100; // bulk materials seeded on peer A (kept modest per run).

/** Peer-count tiers + convergence budgets (ms). Placeholders (§11.1). */
const TIERS: ReadonlyArray<{ peers: number; budgetMs: number }> = [
  { peers: 2, budgetMs: 5_000 },
  { peers: 3, budgetMs: 10_000 },
  { peers: 4, budgetMs: 20_000 },
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
  await peer.page.waitForSelector('[data-testid="material-stock-viewport"]');
};

/** Poll a peer's main-process catalog until the probe material resolves. */
const waitConverged = async (peer: Peer, probeId: string) => {
  await peer.page.waitForFunction(
    /* istanbul ignore next */
    async (id: string) => {
      const m = await window.electron.jazz.materials.get(id);
      return Boolean(m) && m!.id === id;
    },
    {},
    probeId,
  );
};

describe.each(TIERS)(
  "Catalog convergence — $peers peers (perf)",
  ({ peers, budgetMs }) => {
    let harness: CollaborativeHarness | null = null;
    let peerA: Peer;
    let others: Peer[] = [];
    const SHARED_WS = `perf-converge-${peers}p-${Math.floor(Math.random() * 1e6)}`;

    beforeAll(async () => {
      harness = await spawnCollaborativePeers({
        count: peers,
        namePrefix: `perf-converge-${peers}p-${Date.now()}`,
        debug: process.env.KLIPPEL_DEV_LOG === "1",
      });
      [peerA, ...others] = harness.peers;

      // Peer A creates + shares the workspace.
      await openNewWorkspacePanel(peerA.page);
      await typeNewWorkspaceName(peerA.page, SHARED_WS);
      await confirmNewWorkspace(peerA.page);
      await openShareWorkspacePanel(peerA.page);
      const attrs = await readShareWorkspaceAttrs(peerA.page);
      expect(attrs.coId).toMatch(/^co_/);
      await confirmShareWorkspace(peerA.page);

      // Every other peer joins by coId + syncUrl.
      for (const [i, peer] of others.entries()) {
        await openJoinWorkspacePanel(peer.page);
        await fillJoinWorkspaceForm(peer.page, {
          coId: attrs.coId,
          syncUrl: attrs.syncUrl,
          name: `joined-${SHARED_WS}-${i}`,
        });
        await confirmJoinWorkspace(peer.page);
      }

      // Peer A opens the stock viewport so the seed helper can wait on
      // its row-count mirror. Joiners read through the main IPC, so they
      // don't need the viewport mounted.
      await switchToMateriaisTab(peerA);
      await openStockViewport(peerA);
    }, 240_000);

    afterAll(async () => {
      if (harness) await harness.teardown();
    });

    it(`converges ${COUNT} materials to ${peers} peers within ${budgetMs}ms`, async () => {
      const { ms, result } = await measure(async () => {
        const seeded = await seedSyntheticMaterials(peerA.page, {
          count: COUNT,
          seed: `converge-${peers}`,
        });
        // Wait until every joiner's catalog carries the probe.
        await Promise.all(
          others.map((p) => waitConverged(p, seeded.index.probes.search)),
        );
        return seeded;
      });

      recordPerf({
        surface: "seed-write",
        cardinality: result.index.count,
        peers,
        metric: "ms",
        value: result.seedMs,
      });
      expectWithinBudget(
        {
          surface: "convergence",
          cardinality: result.index.count,
          peers,
          metric: "ms",
          value: ms,
        },
        budgetMs,
      );

      // Sanity: a joiner resolves the probe by id (O(1), no scan).
      const probe = await others[0].page.evaluate(
        (id) => window.electron.jazz.materials.get(id),
        result.index.probes.search,
      );
      expect(probe?.externalId).toBe(PROBE_TOKENS.search);
    }, 240_000);
  },
);
