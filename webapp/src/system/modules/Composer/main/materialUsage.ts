/**
 * How many models use each material — Composer's answer to the ranking
 * question Materials asks when it decides which page of the catalog a cold
 * renderer should get (`Materials/main/usage.ts`).
 *
 * Composer owns this because it owns `graphJson`: a material's usage is the
 * `MATERIAL` nodes that point at it, and nothing outside this module should
 * have to know that shape. Materials only ever sees `id → count`.
 *
 * Counting is per *model*, not per node: a material referenced by ten nodes of
 * one model is not more broadly useful than one referenced once by each of
 * five models, and the first page should reflect breadth.
 */
import { allModelGraphs } from "./modelsService";

/**
 * Materials referenced by one model's graph, de-duplicated.
 *
 * Tolerant by construction: a graph that fails to parse, or that predates
 * `MATERIAL` nodes, contributes nothing. Usage only orders a page — a model
 * we cannot read should cost its materials some rank, never the read itself.
 */
export function materialIdsInGraph(graphJson: string): Set<string> {
  const out = new Set<string>();
  let parsed: { nodes?: Record<string, { type?: string; materialId?: string }> };
  try {
    parsed = JSON.parse(graphJson) as typeof parsed;
  } catch {
    return out;
  }
  for (const node of Object.values(parsed.nodes ?? {})) {
    if (node?.type !== "MATERIAL") continue;
    if (typeof node.materialId === "string" && node.materialId) {
      out.add(node.materialId);
    }
  }
  return out;
}

/**
 * `materialId → number of models referencing it`, across the active
 * workspace.
 *
 * Reads every model's `graphJson`. That used to mean deep-resolving every
 * model body — the reason this is cached in `Materials/main/usage.ts` and
 * recomputed on a graph write rather than per page request. It is one column
 * of one table now, but the caching still earns its keep: models are counted
 * in the tens, materials in the tens of thousands.
 */
export async function collectComposerMaterialUsage(): Promise<
  Record<string, number>
> {
  const counts: Record<string, number> = {};
  // Every model's graph, from SQLite. Still the whole set — usage is a
  // question about all of them — but it is now one indexed read of one column
  // rather than a deep resolve of every model body.
  for (const model of await allModelGraphs()) {
    for (const materialId of materialIdsInGraph(model.graphJson)) {
      counts[materialId] = (counts[materialId] ?? 0) + 1;
    }
  }
  return counts;
}
