import type { OptimizationGoal, OptimizationMove } from '../../../../src/kernel/modules/Optimizer/types';
import { getPage } from '../../mcp/puppeteer';
import { editMaterialTool } from '../../../../src/system/modules/Composer/mcpTools/editMaterial';

interface MaterialNode {
  label: string;
  materialId: number;
  typeRestrictions: string[];
}

interface CatalogEntry {
  id: number;
}

interface MaterialCostState {
  nodes: MaterialNode[];
  totalCost: number;
}

type CatalogByType = Record<string, CatalogEntry[]>;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Single CDP round-trip reads all needed state from the renderer.
async function readRendererState(): Promise<{ nodes: MaterialNode[]; totalCost: number; catalogByType: CatalogByType }> {
  const page = await getPage();
  return page.evaluate(() => {
    const state = (window as any).__klippel?.getState();
    if (!state) return { nodes: [], totalCost: 0, catalogByType: {} };

    const activeVPName: string = state?.Layout?.viewportManager?.activeViewport;
    const vp = state?.Layout?.viewportManager?.viewports?.[activeVPName];
    const variationId: string | undefined = vp?.extra?.variationId;
    if (!variationId) return { nodes: [], totalCost: 0, catalogByType: {} };

    const variation = state?.Composer?.variations?.[variationId];
    const graph = variation ? state?.Graph?.graphs?.[variation.instanceId] : null;
    if (!graph) return { nodes: [], totalCost: 0, catalogByType: {} };

    const nodes: MaterialNode[] = Object.values(graph.nodes as Record<string, any>)
      .filter((n: any) => n.type === 'MATERIAL')
      .map((n: any) => ({
        label: n.label,
        materialId: n.materialId,
        typeRestrictions: n.typeRestrictions ?? [],
      }));

    let totalCost = 0;
    Object.values(graph.nodes as Record<string, any>)
      .filter((n: any) => n.type === 'MATERIAL')
      .forEach((n: any) => {
        totalCost += (n.computedTotal ?? n.computedCost)?.quotient?.amount ?? 0;
      });

    const rawMaterials: Record<string, any> = state?.Materials?.materials ?? {};
    const allTypes = [...new Set(nodes.flatMap((n) => n.typeRestrictions))];
    const catalogByType: CatalogByType = {};
    for (const type of allTypes) {
      catalogByType[type] = Object.values(rawMaterials)
        .filter((m: any) => m.type === type)
        .map((m: any) => ({ id: m.id }));
    }

    return { nodes, totalCost, catalogByType };
  });
}

function pickNeighbor(nodes: MaterialNode[], catalogByType: CatalogByType): OptimizationMove | null {
  const eligible = nodes.filter((n) =>
    n.typeRestrictions.some((t) => (catalogByType[t]?.length ?? 0) > 1),
  );
  if (!eligible.length) return null;

  const node = eligible[Math.floor(Math.random() * eligible.length)];
  const type = node.typeRestrictions.find((t) => (catalogByType[t]?.length ?? 0) > 1);
  if (!type) return null;
  const candidates = catalogByType[type].filter((m) => m.id !== node.materialId);
  if (!candidates.length) return null;

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    description: `swap "${node.label}" → materialId ${target.id} (was ${node.materialId})`,
    toolName: editMaterialTool.name,
    args: { label: node.label, materialId: target.id },
    revertArgs: { label: node.label, materialId: node.materialId },
  };
}

// Cached catalog — loaded once per warmUp, stable across iterations
let cachedCatalog: CatalogByType | null = null;

interface State extends MaterialCostState {
  catalogByType: CatalogByType;
}

export const materialCostGoal: OptimizationGoal<State> = {
  name: 'minimizeMaterialCost',
  description: 'Swap materials in the active garment variation to minimize total cost while respecting type restrictions.',

  async warmUp() {
    const { catalogByType } = await readRendererState();
    cachedCatalog = catalogByType;
  },

  async readState() {
    const { nodes, totalCost, catalogByType } = await readRendererState();
    return { nodes, totalCost, catalogByType: cachedCatalog ?? catalogByType };
  },

  evaluateCost(state) {
    return state.totalCost;
  },

  generateMove(state) {
    return pickNeighbor(state.nodes, state.catalogByType);
  },

  async applyMove(move) {
    await editMaterialTool.execute(move.args as Parameters<typeof editMaterialTool.execute>[0]);
    await sleep(500); // wait for Redux debounce + cost recomputation
  },

  async revertMove(move) {
    await editMaterialTool.execute(move.revertArgs as Parameters<typeof editMaterialTool.execute>[0]);
    await sleep(500);
  },

  async restoreState(bestState) {
    const current = await readRendererState();
    for (const best of bestState.nodes) {
      const live = current.nodes.find((n) => n.label === best.label);
      if (live && live.materialId !== best.materialId) {
        await editMaterialTool.execute({ label: best.label, materialId: best.materialId });
        await sleep(500);
      }
    }
  },
};
