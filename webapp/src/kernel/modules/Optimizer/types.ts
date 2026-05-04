/**
 * A single reversible action in the optimization search space.
 * `toolName` identifies which MCP tool performs the action (for traceability).
 * `args` / `revertArgs` are the tool inputs needed to apply and undo the move.
 */
export interface OptimizationMove {
  description: string;
  toolName: string;
  args: Record<string, unknown>;
  revertArgs: Record<string, unknown>;
}

/**
 * Generic contract that any optimization goal must fulfill.
 * TState is the domain-specific snapshot type (e.g. material nodes + costs).
 *
 * The SA runner calls these methods in order per iteration:
 *   readState → evaluateCost → generateMove → applyMove
 *   → readState → evaluateCost → accept/revertMove
 *
 * Timing (debounces, waits) is the goal's responsibility inside applyMove/revertMove.
 */
export interface OptimizationGoal<TState = unknown> {
  /** Unique name used to look up this goal in the registry. */
  name: string;
  description: string;
  /** Optional one-time setup (e.g. pre-load a catalog). Called once before the loop. */
  warmUp?: () => Promise<void>;
  readState: () => Promise<TState>;
  evaluateCost: (state: TState) => number;
  /** Returns null when no valid neighbor exists (search space exhausted). */
  generateMove: (state: TState) => OptimizationMove | null;
  applyMove: (move: OptimizationMove) => Promise<void>;
  revertMove: (move: OptimizationMove) => Promise<void>;
  /** Optional: called at the end of the loop to restore the best-ever state. */
  restoreState?: (state: TState) => Promise<void>;
}

export interface SAOptions {
  maxIterations?: number;
  /** Stop early when cost drops by this fraction, e.g. 0.15 = 15% savings. */
  targetReduction?: number;
  initialTemperature?: number;
  coolingRate?: number;
}

export interface CompletedMove {
  iteration: number;
  description: string;
  costBefore: number;
  costAfter: number;
  accepted: boolean;
  temperature: number;
}

export interface OptimizationResult {
  goalName: string;
  initialCost: number;
  finalCost: number;
  improvement: number;
  improvementPct: number;
  iterations: number;
  moves: CompletedMove[];
}
