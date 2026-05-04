import type { MaterialNodeSummary, MaterialCatalogEntry } from './types';

const INITIAL_TEMPERATURE = 1.0;
const COOLING_RATE = 0.85;
const MIN_TEMPERATURE = 0.01;

export interface SAMove {
  nodeLabel: string;
  fromMaterialId: number;
  toMaterialId: number;
}

export function pickNeighbor(
  nodes: MaterialNodeSummary[],
  catalogByType: Record<string, MaterialCatalogEntry[]>,
): SAMove | null {
  const eligible = nodes.filter(
    (n) => n.typeRestrictions.length > 0 && n.typeRestrictions.some((t) => (catalogByType[t]?.length ?? 0) > 1),
  );
  if (!eligible.length) return null;

  const node = eligible[Math.floor(Math.random() * eligible.length)];
  const type = node.typeRestrictions[Math.floor(Math.random() * node.typeRestrictions.length)];
  const candidates = (catalogByType[type] ?? []).filter((m) => m.id !== node.materialId);
  if (!candidates.length) return null;

  const target = candidates[Math.floor(Math.random() * candidates.length)];
  return { nodeLabel: node.label, fromMaterialId: node.materialId, toMaterialId: target.id };
}

export function shouldAccept(currentCost: number, newCost: number, temperature: number): boolean {
  if (newCost <= currentCost) return true;
  const delta = newCost - currentCost;
  return Math.random() < Math.exp(-delta / temperature);
}

export function cool(temperature: number): number {
  return Math.max(temperature * COOLING_RATE, MIN_TEMPERATURE);
}

export function initialTemperature(): number {
  return INITIAL_TEMPERATURE;
}

export function isFrozen(temperature: number): boolean {
  return temperature <= MIN_TEMPERATURE;
}
