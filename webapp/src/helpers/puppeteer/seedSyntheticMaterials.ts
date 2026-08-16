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
   * Wall-clock ms from issuing the seed to the catalog being usable: the
   * renderer reports N materials (`data-material-count`) *and* has a page of
   * them on screen (`data-material-view` > 0).
   *
   * This used to mean "all N rows on screen", which stopped being a
   * meaningful milestone when the renderer started mirroring a window rather
   * than the whole catalog — the grid deliberately never holds all N. What it
   * measures now is the same user-facing thing it always stood for, "time to
   * a usable stock view": seed-write + window IPC + Redux + grid render.
   * Budgets calibrated against the old meaning need re-baselining.
   */
  totalMs: number;
}

/**
 * Rows per chunk on the batched path. One chunk is a structured clone plus
 * that many CoValue writes on main's thread, so it is the unit of "how long
 * main is unavailable at a time" — small enough that the renderer keeps
 * painting between chunks, large enough that a 10k seed is ~10 round trips
 * rather than hundreds.
 */
export const SEED_CHUNK_SIZE = 1_000;

/**
 * Largest count the batched live path will attempt. Above this the seed
 * itself dominates the run and the fixture must be materialized out of band
 * (direct-SQLite) and copied in — §11.2's 100k tier.
 */
export const CHUNKED_SEED_MAX = 20_000;

/**
 * How long the chunked path waits for the renderer to catch up with the
 * fixture. Generous on purpose — see the comment at the wait itself.
 */
const SEED_WAIT_TIMEOUT_MS = 300_000;

/**
 * Seed a catalog larger than one IPC can carry, by appending chunks.
 *
 * This is §11.2's "batched (chunked)" path for the 10k tier. It is fixture
 * construction, not a product surface: `seedChunk` appends unconditionally,
 * so the catalog must be empty (call `resetWorkspace` first) or ids will
 * collide with whatever is already there.
 *
 * Returns the same shape as `seedSyntheticMaterials`; `seedMs` covers every
 * chunk, and `totalMs` runs to the same "usable stock view" milestone.
 */
export const seedSyntheticMaterialsChunked = async (
  page: Page,
  opts: GenerateOpts,
): Promise<SeedResult> => {
  if (opts.count > CHUNKED_SEED_MAX) {
    throw new Error(
      `seedSyntheticMaterialsChunked: count=${opts.count} exceeds the batched ` +
        `live tier (${CHUNKED_SEED_MAX}). Materialize the base workspace out of ` +
        `band (direct-SQLite) and load it via BASE_WORKSPACE — e2e-tests.md §11.2.`,
    );
  }

  const { input, index } = generateMaterialsCatalog(opts);

  // Edges are keyed on their source material, so a chunk carries the rows and
  // exactly their edges — a material must never land in the catalog before
  // the edges that give it an industry and suppliers, or a window read
  // between two chunks would mirror a row with no relations.
  const edgesBySource = new Map<string, typeof input.edges>();
  for (const edge of input.edges) {
    const bucket = edgesBySource.get(edge.sourceId);
    if (bucket) bucket.push(edge);
    else edgesBySource.set(edge.sourceId, [edge]);
  }

  const t0 = performance.now();
  for (let offset = 0; offset < input.materials.length; offset += SEED_CHUNK_SIZE) {
    const materials = input.materials.slice(offset, offset + SEED_CHUNK_SIZE);
    const edges = materials.flatMap((m) => edgesBySource.get(m.id) ?? []);
    await page.evaluate(
      /* istanbul ignore next */
      (payload) => window.electron.jazz.materials.seedChunk(payload),
      {
        materials,
        edges,
        // Types / orgs are bounded and idempotent on the main side; sending
        // them with the first chunk only would make a failed first chunk
        // silently produce rows with unresolvable types.
        materialTypes: input.materialTypes,
        industries: input.industries,
        sellers: input.sellers,
      },
    );
  }
  const seedMs = performance.now() - t0;

  // Fixture construction, not a measured surface: the renderer only learns
  // the new size from a catalog tick, and those ticks are competing with the
  // remaining chunk writes on main's thread. The default 30 s selector
  // timeout is a budget-shaped number in a place that has no budget, so it is
  // raised explicitly — a slow seed must fail as "took too long to build the
  // fixture", loudly, not as a mysterious selector timeout.
  const seedWait = { timeout: SEED_WAIT_TIMEOUT_MS };
  await page.waitForSelector(
    `[data-testid="material-stock-viewport"][data-material-count="${index.count}"]`,
    seedWait,
  );
  await page.waitForSelector(
    '[data-testid="material-stock-viewport"]:not([data-material-view="0"])',
    seedWait,
  );
  const totalMs = performance.now() - t0;

  return { index, seedMs, totalMs };
};

export const seedSyntheticMaterials = async (
  page: Page,
  opts: GenerateOpts,
): Promise<SeedResult> => {
  if (opts.count > LIVE_SEED_MAX) {
    throw new Error(
      `seedSyntheticMaterials: count=${opts.count} exceeds the single-call ` +
        `live-IPC tier (${LIVE_SEED_MAX}). Use seedSyntheticMaterialsChunked ` +
        `up to ${CHUNKED_SEED_MAX}, or materialize the base workspace out of ` +
        `band (direct-SQLite) and load it via BASE_WORKSPACE — e2e-tests.md §11.2.`,
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

  // Wait for the renderer to see the whole catalog and to have a page of it
  // rendered. Both are single selector waits (§11.4), not snapshot scans.
  //
  // `data-material-count` is the catalog-wide match count (empty query ⇒ the
  // catalog size), so it still reads "the catalog reached N". It is not the
  // number of rows in the view any more — `data-material-view` is, and it
  // caps at the window size by design, so it can only be asserted as "> 0"
  // here. (`data-material-loaded` is narrower still: view minus the
  // placeholders whose data the residency sweep has reclaimed.)
  await page.waitForSelector(
    `[data-testid="material-stock-viewport"][data-material-count="${index.count}"]`,
  );
  await page.waitForSelector(
    '[data-testid="material-stock-viewport"]:not([data-material-view="0"])',
  );
  const totalMs = performance.now() - t0;

  return { index, seedMs, totalMs };
};
