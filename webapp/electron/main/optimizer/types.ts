export interface OptimizationOptions {
  maxIterations?: number;    // default 50
  targetReduction?: number;  // e.g. 0.15 = stop when cost drops 15% from initial
}

export interface OptimizationMove {
  iteration: number;
  nodeLabel: string;
  fromMaterialId: number;
  toMaterialId: number;
  costBefore: number;
  costAfter: number;
  accepted: boolean;
}

export interface OptimizationResult {
  initialCost: number;
  finalCost: number;
  improvement: number;      // absolute cost reduction
  improvementPct: number;   // percentage cost reduction
  iterations: number;
  moves: OptimizationMove[];
}

export interface MaterialNodeSummary {
  id: string;
  label: string;
  materialId: number;
  typeRestrictions: string[];
}

export interface MaterialCatalogEntry {
  id: number;
  type: string;
}

export interface SAState {
  temperature: number;
  bestCost: number;
  bestSnapshot: Array<{ nodeLabel: string; materialId: number }>;
  stagnantRounds: number;
}
