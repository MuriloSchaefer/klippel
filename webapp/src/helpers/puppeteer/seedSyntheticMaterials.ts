/* istanbul ignore file */
/**
 * The single seeding entry point a performance test calls. Generates a
 * deterministic synthetic catalog (see `generateMaterialsCatalog`),
 * writes it through the tier-appropriate path, and waits on the
 * DataGrid count mirror so the caller knows the grid has rendered all
 * rows before it starts measuring. Returns the `CatalogIndex` sidecar
 * so the test can address probes / sample ids a priori.
 *
 * Tiering (see e2e-tests.md §11.2):
 *   ≤ 1k  → live `seed` IPC (this file).
 *   ≥ 10k → must be materialized out of band (direct-SQLite) and copied
 *           in via `BASE_WORKSPACE`; the live IPC path throws so a test
 *           does not silently OOM the main process.
 *
 * Preconditions: the renderer is on the Materiais → MaterialStock
 * viewport (so the count mirror is mounted) and the catalog is empty
 * (`seedCatalogIfEmpty` no-ops otherwise — we assert `seeded === true`).
 */
import type { Page } from "puppeteer-core";
import {
  generateMaterialsCatalog,
  type CatalogIndex,
  type GenerateOpts,
} from "./generateMaterialsCatalog";

/** Largest count we will push through the single-call live `seed` IPC. */
export const LIVE_SEED_MAX = 1_000;

export interface SeedResult {
  /** Sidecar for a-priori addressing (probes, sample ids). */
  index: CatalogIndex;
  /** Wall-clock ms of the `seed` IPC alone — the bulk-write cost. */
  seedMs: number;
  /**
   * Wall-clock ms from issuing the seed to all N rows being visible in
   * the grid (count mirror == N). This is the user-facing "time to N
   * materials on screen": seed-write + catalog-load IPC + Redux + grid
   * render. This is the number a cold-open / render budget asserts on.
   */
  totalMs: number;
}

export const seedSyntheticMaterials = async (
  page: Page,
  opts: GenerateOpts,
): Promise<SeedResult> => {
  if (opts.count > LIVE_SEED_MAX) {
    throw new Error(
      `seedSyntheticMaterials: count=${opts.count} exceeds the live-IPC tier ` +
        `(${LIVE_SEED_MAX}). Materialize the base workspace out of band ` +
        `(direct-SQLite) and load it via BASE_WORKSPACE — see e2e-tests.md §11.2.`,
    );
  }

  const { input, index } = generateMaterialsCatalog(opts);

  const t0 = performance.now();
  const { seeded } = await page.evaluate(
    /* istanbul ignore next */
    (payload) => window.electron.jazz.materials.seed(payload),
    input,
  );
  const seedMs = performance.now() - t0;
  if (!seeded) {
    throw new Error(
      "seedSyntheticMaterials: catalog was not empty (seed no-op). " +
        "Call resetWorkspace before seeding.",
    );
  }

  // Wait for the renderer to load the catalog and the grid to render
  // every row — the count mirror is a single selector wait (§11.4), not
  // a snapshot scan. Empty query ⇒ filtered count == total.
  await page.waitForSelector(
    `[data-testid="material-stock-viewport"][data-material-count="${index.count}"]`,
  );
  const totalMs = performance.now() - t0;

  return { index, seedMs, totalMs };
};
