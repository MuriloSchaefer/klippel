/* istanbul ignore file */
/**
 * Role-aware peer pool for collaborative performance tests.
 *
 * Scaling collaborative perf to 2 → 100 peers cannot use one peer type:
 * a full Electron renderer per peer is infeasible past a handful. So the
 * pool has two classes (see analysis/performance-tests.md "Peer scaling"
 * and e2e-tests.md §11):
 *
 *   - **Observers** — full Electron instances (the current
 *     `collaborativeHarness`). They bear UI; their render/search/update
 *     budgets are what we assert. Keep this 1–2.
 *   - **Load peers** — headless `jazz-tools` nodes (NO renderer) that
 *     hold an account, join the workspace by coId, subscribe the catalog
 *     CoValue, and generate write load. Run them **in-process** (one node
 *     process hosting K jazz nodes) so 50–100 peers stay affordable.
 *
 * All peers connect to the single in-memory cojson sync server the
 * collaborative harness already spawns (a star/relay topology — the
 * production-realistic answer past the ~8–10-peer WebRTC mesh ceiling,
 * see jazz-performance.md §2.3).
 *
 * STATUS: the observer path delegates to the existing harness and works
 * today. The headless load-peer pool is scaffolded with the intended
 * surface and TODOs — implement before writing > 5-peer tests.
 */
import {
  spawnCollaborativePeers,
  type CollaborativeHarness,
  type Peer,
} from "./collaborativeHarness";
import type { GenerateOpts } from "./generateMaterialsCatalog";

/**
 * A headless, UI-less Jazz peer used purely to generate sync load and to
 * sample convergence cheaply (by-coId, never a full snapshot — §11.4).
 */
export interface HeadlessPeer {
  readonly id: string;
  /** Drive `opsPerSec` material writes for `durationMs`. Resolves when done. */
  write(opsPerSec: number, durationMs: number): Promise<void>;
  /**
   * O(1) convergence probe: resolve the given material id off this peer's
   * live catalog view; `null` when not yet synced.
   */
  seesProbe(materialId: string): Promise<unknown | null>;
  stop(): Promise<void>;
}

export interface PeerPool {
  /** Electron, UI-bearing. `observers[i].page` is a puppeteer Page. */
  observers: Peer[];
  /** Headless jazz-tools load generators. */
  load: HeadlessPeer[];
  sync: CollaborativeHarness["sync"];
  teardown(): Promise<void>;
}

export interface SpawnPeerPoolOptions {
  /** UI-bearing Electron peers (keep 1–2). */
  observers: number;
  /** Headless load peers (the bulk; in-process). */
  loadPeers: number;
  /** Shared workspace name the observers create/share and load peers join. */
  workspace: string;
  /** Optional initial catalog seeded on the first observer. */
  seed?: GenerateOpts;
  namePrefix?: string;
  debug?: boolean;
}

/**
 * Spawn a role-aware pool. Today it provisions the observer Electron
 * peers + sync server via `spawnCollaborativePeers`; the headless load
 * pool is not yet wired (see TODO).
 */
export const spawnPeerPool = async (
  opts: SpawnPeerPoolOptions,
): Promise<PeerPool> => {
  if (opts.observers < 1) {
    throw new Error("spawnPeerPool: need at least one observer");
  }

  const harness = await spawnCollaborativePeers({
    count: opts.observers,
    namePrefix: opts.namePrefix ?? `perf-${Date.now()}`,
    debug: opts.debug,
  });

  // TODO(perf-pool): provision `opts.loadPeers` headless jazz-tools nodes
  // in-process, each pointed at `harness.sync.url`, joining `opts.workspace`
  // by the observer's shared coId, subscribing the MaterialCatalogCoMap.
  // Expose them as HeadlessPeer (write / seesProbe / stop). See
  // electron/main/jazz.ts for the node-boot + sync-connect pattern to reuse,
  // and analysis/performance-tests.md "Peer scaling" for the design.
  // TODO(perf-pool): if `opts.seed`, seed the first observer's catalog via
  // `seedSyntheticMaterials` (workspace must be shared first).
  const load: HeadlessPeer[] = [];
  if (opts.loadPeers > 0) {
    throw new Error(
      `spawnPeerPool: headless load peers not yet implemented ` +
        `(requested ${opts.loadPeers}). Observer-only pools work today; ` +
        `see TODO(perf-pool) in peerPool.ts.`,
    );
  }

  return {
    observers: harness.peers,
    load,
    sync: harness.sync,
    teardown: () => harness.teardown(),
  };
};

/** Sample K peers deterministically for cheap convergence assertions (§11.4). */
export const samplePeers = <T>(peers: T[], k: number): T[] =>
  peers.slice(0, Math.min(k, peers.length));
