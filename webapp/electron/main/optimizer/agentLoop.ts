import { getMaterialNodesTool } from '../../../src/system/modules/Composer/mcpTools/queryComposerState';
import { getGarmentCostSummaryTool } from '../../../src/system/modules/Composer/mcpTools/queryComposerState';
import { getAvailableMaterialsTool } from '../../../src/system/modules/Composer/mcpTools/queryComposerState';
import { editMaterialTool } from '../../../src/system/modules/Composer/mcpTools/editMaterial';
import {
  pickNeighbor,
  shouldAccept,
  cool,
  initialTemperature,
  isFrozen,
} from './simulatedAnnealing';
import type {
  OptimizationOptions,
  OptimizationResult,
  OptimizationMove,
  MaterialNodeSummary,
  MaterialCatalogEntry,
} from './types';

const DEFAULT_MAX_ITERATIONS = 50;
const COST_RECOMPUTE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseToolText<T>(result: { content: Array<{ type: string; text: string }> }): T {
  return JSON.parse(result.content[0].text) as T;
}

async function readCost(): Promise<number> {
  const result = await getGarmentCostSummaryTool.execute({} as never);
  const data = parseToolText<{ totalCost?: number; error?: string }>(result);
  if (data.error) throw new Error(`Cost read failed: ${data.error}`);
  return data.totalCost ?? 0;
}

async function readNodes(): Promise<MaterialNodeSummary[]> {
  const result = await getMaterialNodesTool.execute({} as never);
  const data = parseToolText<{ nodes?: MaterialNodeSummary[]; error?: string }>(result);
  if (data.error) throw new Error(`Node read failed: ${data.error}`);
  return data.nodes ?? [];
}

async function readCatalogForTypes(types: string[]): Promise<Record<string, MaterialCatalogEntry[]>> {
  const catalog: Record<string, MaterialCatalogEntry[]> = {};
  await Promise.all(
    types.map(async (typeName) => {
      const result = await getAvailableMaterialsTool.execute({ typeName });
      const data = parseToolText<{ materials?: MaterialCatalogEntry[] }>(result);
      catalog[typeName] = data.materials ?? [];
    }),
  );
  return catalog;
}

export async function runOptimizationLoop(options: OptimizationOptions = {}): Promise<OptimizationResult> {
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const targetReduction = options.targetReduction;

  const initialCost = await readCost();
  if (initialCost === 0) {
    return { initialCost: 0, finalCost: 0, improvement: 0, improvementPct: 0, iterations: 0, moves: [] };
  }

  const nodes = await readNodes();
  const allTypes = [...new Set(nodes.flatMap((n) => n.typeRestrictions))];
  const catalogByType = await readCatalogForTypes(allTypes);

  let currentCost = initialCost;
  let temperature = initialTemperature();
  let bestCost = initialCost;
  let bestSnapshot = nodes.map((n) => ({ nodeLabel: n.label, materialId: n.materialId }));

  const moves: OptimizationMove[] = [];
  let iteration = 0;

  while (iteration < maxIterations && !isFrozen(temperature)) {
    if (targetReduction !== undefined && (initialCost - bestCost) / initialCost >= targetReduction) break;

    const freshNodes = await readNodes();
    const move = pickNeighbor(freshNodes, catalogByType);
    if (!move) break;

    await editMaterialTool.execute({ label: move.nodeLabel, materialId: move.toMaterialId });
    await sleep(COST_RECOMPUTE_DELAY_MS);

    const newCost = await readCost();
    const accepted = shouldAccept(currentCost, newCost, temperature);

    moves.push({
      iteration,
      nodeLabel: move.nodeLabel,
      fromMaterialId: move.fromMaterialId,
      toMaterialId: move.toMaterialId,
      costBefore: currentCost,
      costAfter: newCost,
      accepted,
    });

    if (accepted) {
      currentCost = newCost;
      if (currentCost < bestCost) {
        bestCost = currentCost;
        const updatedNodes = await readNodes();
        bestSnapshot = updatedNodes.map((n) => ({ nodeLabel: n.label, materialId: n.materialId }));
      }
    } else {
      await editMaterialTool.execute({ label: move.nodeLabel, materialId: move.fromMaterialId });
      await sleep(COST_RECOMPUTE_DELAY_MS);
    }

    temperature = cool(temperature);
    iteration++;
  }

  // Restore best snapshot if current state is worse
  if (currentCost > bestCost) {
    for (const snap of bestSnapshot) {
      const current = nodes.find((n) => n.label === snap.nodeLabel);
      if (current && current.materialId !== snap.materialId) {
        await editMaterialTool.execute({ label: snap.nodeLabel, materialId: snap.materialId });
        await sleep(COST_RECOMPUTE_DELAY_MS);
      }
    }
  }

  const finalCost = await readCost();
  const improvement = initialCost - finalCost;
  const improvementPct = initialCost > 0 ? (improvement / initialCost) * 100 : 0;

  return { initialCost, finalCost, improvement, improvementPct: Math.round(improvementPct * 10) / 10, iterations: iteration, moves };
}
