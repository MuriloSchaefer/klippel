import { getPage } from '../../../../../electron/main/mcp/puppeteer';

type UnitValue = { unit: string; amount: number };
type CompoundValue = { quotient: UnitValue; dividend: UnitValue };

interface MaterialNodeSummary {
  id: string;
  label: string;
  materialId: number;
  typeRestrictions: string[];
  computedCost?: CompoundValue;
  computedTotal?: CompoundValue;
}

interface MaterialCatalogEntry {
  id: number;
  type: string;
  attributes: Record<string, unknown>;
}

async function readState(page: Awaited<ReturnType<typeof getPage>>) {
  return page.evaluate(() => (window as any).__klippel?.getState());
}

export const getActiveVariationIdTool = {
  name: 'getActiveVariationId',
  description: 'Returns the variationId of the currently open garment model in the active viewport.',
  inputSchema: {},
  async execute(_args: Record<string, never>) {
    const page = await getPage();
    const state = await readState(page);
    const activeVPName: string = state?.Layout?.viewportManager?.activeViewport;
    const vp = state?.Layout?.viewportManager?.viewports?.[activeVPName];
    const variationId: string | undefined = vp?.extra?.variationId;
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ variationId: variationId ?? null }) }],
    };
  },
};

export const getMaterialNodesTool = {
  name: 'getMaterialNodes',
  description:
    'Returns all material nodes in the active variation, including their label, assigned materialId, type restrictions, and computed cost.',
  inputSchema: {},
  async execute(_args: Record<string, never>) {
    const page = await getPage();
    const state = await readState(page);

    const activeVPName: string = state?.Layout?.viewportManager?.activeViewport;
    const vp = state?.Layout?.viewportManager?.viewports?.[activeVPName];
    const variationId: string | undefined = vp?.extra?.variationId;
    if (!variationId) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No active variation' }) }] };
    }

    const variation = state?.Composer?.variations?.[variationId];
    if (!variation) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Variation not found' }) }] };
    }

    const graph = state?.Graph?.graphs?.[variation.instanceId];
    if (!graph) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Graph not found' }) }] };
    }

    const materialNodes: MaterialNodeSummary[] = Object.values(graph.nodes as Record<string, any>)
      .filter((n: any) => n.type === 'MATERIAL')
      .map((n: any) => ({
        id: n.id,
        label: n.label,
        materialId: n.materialId,
        typeRestrictions: n.typeRestrictions ?? [],
        computedCost: n.computedCost,
        computedTotal: n.computedTotal,
      }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ variationId, nodes: materialNodes }) }],
    };
  },
};

export const getAvailableMaterialsTool = {
  name: 'getAvailableMaterials',
  description:
    'Returns catalog materials filtered by a given type name. Use the typeRestrictions from getMaterialNodes to find valid substitutes.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      typeName: { type: 'string', description: 'Material type name, e.g. "tecido-e-malha"' },
    },
    required: ['typeName'],
  },
  async execute({ typeName }: { typeName: string }) {
    const page = await getPage();
    const state = await readState(page);

    const rawMaterials: Record<string, any> = state?.Materials?.materials ?? {};
    const filtered: MaterialCatalogEntry[] = Object.values(rawMaterials)
      .filter((m: any) => m.type === typeName)
      .map((m: any) => ({ id: m.id, type: m.type, attributes: m.attributes ?? {} }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ typeName, materials: filtered }) }],
    };
  },
};

export const getGarmentCostSummaryTool = {
  name: 'getGarmentCostSummary',
  description:
    'Returns the total computed cost for the active garment variation, plus a per-material-node breakdown. Uses computedTotal (grade-aware) when available, falling back to computedCost.',
  inputSchema: {},
  async execute(_args: Record<string, never>) {
    const page = await getPage();
    const state = await readState(page);

    const activeVPName: string = state?.Layout?.viewportManager?.activeViewport;
    const vp = state?.Layout?.viewportManager?.viewports?.[activeVPName];
    const variationId: string | undefined = vp?.extra?.variationId;
    if (!variationId) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No active variation' }) }] };
    }

    const variation = state?.Composer?.variations?.[variationId];
    const graph = variation ? state?.Graph?.graphs?.[variation.instanceId] : null;
    if (!graph) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Graph not found' }) }] };
    }

    const breakdown: Array<{ label: string; materialId: number; cost: number; unit: string }> = [];
    let totalCost = 0;

    Object.values(graph.nodes as Record<string, any>)
      .filter((n: any) => n.type === 'MATERIAL')
      .forEach((n: any) => {
        const cv: CompoundValue | undefined = n.computedTotal ?? n.computedCost;
        const amount = cv?.quotient?.amount ?? 0;
        const unit = cv?.quotient?.unit ?? '';
        breakdown.push({ label: n.label, materialId: n.materialId, cost: amount, unit });
        totalCost += amount;
      });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ variationId, totalCost, breakdown }),
        },
      ],
    };
  },
};
