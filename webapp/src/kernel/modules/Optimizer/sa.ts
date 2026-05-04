import type { OptimizationGoal, SAOptions, OptimizationResult, CompletedMove } from './types';

const DEFAULTS = {
  maxIterations: 50,
  initialTemperature: 1.0,
  coolingRate: 0.85,
  minTemperature: 0.01,
} as const;

function shouldAccept(currentCost: number, newCost: number, temperature: number): boolean {
  if (newCost <= currentCost) return true;
  return Math.random() < Math.exp(-(newCost - currentCost) / temperature);
}

function cool(temperature: number, rate: number): number {
  return Math.max(temperature * rate, DEFAULTS.minTemperature);
}

/**
 * Generic simulated-annealing runner.
 * Has no knowledge of any domain — all domain logic is provided by `goal`.
 */
export async function runSA<TState>(
  goal: OptimizationGoal<TState>,
  options: SAOptions = {},
): Promise<OptimizationResult> {
  const maxIterations = options.maxIterations ?? DEFAULTS.maxIterations;
  const targetReduction = options.targetReduction;
  const coolingRate = options.coolingRate ?? DEFAULTS.coolingRate;
  let temperature = options.initialTemperature ?? DEFAULTS.initialTemperature;

  if (goal.warmUp) await goal.warmUp();

  let state = await goal.readState();
  const initialCost = goal.evaluateCost(state);

  if (initialCost === 0) {
    return { goalName: goal.name, initialCost: 0, finalCost: 0, improvement: 0, improvementPct: 0, iterations: 0, moves: [] };
  }

  let currentCost = initialCost;
  let bestCost = initialCost;
  let bestState = state;
  const moves: CompletedMove[] = [];
  let iteration = 0;

  while (iteration < maxIterations && temperature > DEFAULTS.minTemperature) {
    if (targetReduction !== undefined && (initialCost - bestCost) / initialCost >= targetReduction) break;

    const move = goal.generateMove(state);
    if (!move) break;

    await goal.applyMove(move);
    const newState = await goal.readState();
    const newCost = goal.evaluateCost(newState);
    const accepted = shouldAccept(currentCost, newCost, temperature);

    moves.push({
      iteration,
      description: move.description,
      costBefore: currentCost,
      costAfter: newCost,
      accepted,
      temperature,
    });

    if (accepted) {
      state = newState;
      currentCost = newCost;
      if (currentCost < bestCost) {
        bestCost = currentCost;
        bestState = newState;
      }
    } else {
      await goal.revertMove(move);
      state = await goal.readState();
    }

    temperature = cool(temperature, coolingRate);
    iteration++;
  }

  // Restore best state if the loop ended in a worse position and the goal supports it
  if (currentCost > bestCost && goal.restoreState) {
    await goal.restoreState(bestState);
  }

  const finalCost = goal.evaluateCost(await goal.readState());
  const improvement = initialCost - finalCost;
  const improvementPct = (improvement / initialCost) * 100;

  return {
    goalName: goal.name,
    initialCost,
    finalCost,
    improvement,
    improvementPct: Math.round(improvementPct * 10) / 10,
    iterations: iteration,
    moves,
  };
}
