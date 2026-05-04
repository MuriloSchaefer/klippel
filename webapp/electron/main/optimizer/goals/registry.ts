import type { OptimizationGoal } from '../../../../src/kernel/modules/Optimizer/types';

const goals = new Map<string, OptimizationGoal<unknown>>();

export function registerGoal(goal: OptimizationGoal<unknown>): void {
  goals.set(goal.name, goal);
}

export function getGoal(name: string): OptimizationGoal<unknown> | undefined {
  return goals.get(name);
}

export function listGoals(): Array<{ name: string; description: string }> {
  return [...goals.values()].map(({ name, description }) => ({ name, description }));
}
