import { runSA } from '../../../src/kernel/modules/Optimizer/sa';
import type { SAOptions, OptimizationResult } from '../../../src/kernel/modules/Optimizer/types';
import { getGoal, listGoals } from './goals/registry';

export async function runOptimizationLoop(
  goalName: string,
  options: SAOptions = {},
): Promise<OptimizationResult> {
  const goal = getGoal(goalName);
  if (!goal) {
    const available = listGoals().map((g) => g.name).join(', ');
    throw new Error(`Unknown optimization goal "${goalName}". Available: ${available || '(none registered)'}`);
  }
  return runSA(goal, options);
}
