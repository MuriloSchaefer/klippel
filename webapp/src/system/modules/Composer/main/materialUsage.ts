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
import { ModelCoMap } from "../../../../kernel/modules/Store/schema";
import { requireActiveWorkspaceHandle } from "../../../../../electron/main/jazz";

type SummaryLike = { modelCoId: string };

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
 * Reads every model body, which is the expensive part — `graphJson` is one
 * atomic string per model and is deliberately not in the summary projection.
 * That is affordable here only because the result is cached in
 * `Materials/main/usage.ts` and recomputed on a graph write, never per page
 * request: models are counted in the tens, materials in the tens of
 * thousands.
 */
export async function collectComposerMaterialUsage(): Promise<
  Record<string, number>
> {
  const workspace = (await requireActiveWorkspaceHandle()) as unknown as {
    modelSummaries?: Record<string, unknown> | null;
  };
  const summaries = workspace.modelSummaries;
  if (!summaries) return {};

  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(summaries)) {
    if (key === "$jazz" || !value || typeof value !== "object") continue;
    const coId = (value as SummaryLike).modelCoId;
    if (!coId) continue;
    // eslint-disable-next-line no-await-in-loop
    const model = await ModelCoMap.load(coId, { resolve: true });
    const graphJson = (model as unknown as { graphJson?: string } | null)
      ?.graphJson;
    if (!graphJson) continue;
    for (const id of materialIdsInGraph(graphJson)) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}
