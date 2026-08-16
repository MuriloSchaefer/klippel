/**
 * How often each material is actually used, so the first page the renderer
 * gets is the page it is most likely to need.
 *
 * The catalog itself cannot answer this. A material's edges say what it
 * *conforms to* and who supplies it, never who consumes it — usage lives in
 * Composer's model graphs, in another module entirely. Rather than have
 * Materials reach into Composer's CoValues (and take a dependency on the
 * shape of `graphJson`), Composer *registers* a provider here and Materials
 * asks for counts when it needs to rank.
 *
 * Counts are "in how many models does this material appear", not "how many
 * nodes reference it" — a provider is expected to de-duplicate within a
 * model. A material used ten times in one model is not more broadly useful
 * than one used once in each of five.
 */

/**
 * Answers `materialId → number of models using it`. Async because the
 * provider may have to resolve CoValues to find out.
 */
export type MaterialUsageProvider = () =>
  | Promise<Record<string, number>>
  | Record<string, number>;

const providers = new Set<MaterialUsageProvider>();

/**
 * Register a source of usage counts. Returns an unregister thunk.
 *
 * Multiple providers are summed, so a future module with its own notion of
 * "uses a material" can contribute without Materials knowing about it.
 */
export function registerMaterialUsageProvider(
  provider: MaterialUsageProvider,
): () => void {
  providers.add(provider);
  invalidateMaterialUsage();
  return () => {
    providers.delete(provider);
    invalidateMaterialUsage();
  };
}

/**
 * Cached counts. Walking every model's graph is O(models × graph size) —
 * cheap next to the catalog but far too expensive to redo per page request,
 * and the ranking it feeds only has to be *stable*, not instantaneous.
 */
let cached: Map<string, number> | null = null;
let inFlight: Promise<Map<string, number>> | null = null;

/**
 * Drop the cache. Called when a model graph is written (a material was added
 * to or removed from a model) and on workspace close — a stale count only
 * misorders the first page, but a count from *another workspace* would rank
 * ids that do not exist here.
 */
export function invalidateMaterialUsage(): void {
  cached = null;
  inFlight = null;
}

/**
 * `materialId → usage count`, summed across providers.
 *
 * Never throws: a provider that fails contributes nothing rather than taking
 * the catalog read down with it. The consequence of an empty result is a
 * first page ordered by the fallback key alone, which is a worse guess, not a
 * broken one.
 */
export async function collectMaterialUsage(): Promise<Map<string, number>> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const totals = new Map<string, number>();
    for (const provider of [...providers]) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const counts = await provider();
        for (const [id, n] of Object.entries(counts ?? {})) {
          if (!Number.isFinite(n)) continue;
          totals.set(id, (totals.get(id) ?? 0) + n);
        }
      } catch (err) {
        console.error("[materials] usage provider threw", err);
      }
    }
    cached = totals;
    inFlight = null;
    return totals;
  })();

  return inFlight;
}
