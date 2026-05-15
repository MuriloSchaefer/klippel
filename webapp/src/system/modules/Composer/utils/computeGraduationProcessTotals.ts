import type { GraphState } from "@kernel/modules/Graphs/store/state";
import type { GraduationNode, ProcessNode, GraduationProcessTimeAudit } from "../typings";

const TARGET_QUOTIENT = "minutos249";

export function computeGraduationProcessTotals({
  graphState,
}: {
  graphState: GraphState;
}): {
  [graduationNodeId: string]: {
    computedProcessTime: { amount: number; unit: string };
    processTimeAudit: GraduationProcessTimeAudit;
  };
} {
  const processNodes = Object.values(graphState.nodes ?? {}).filter(
    (n): n is ProcessNode => (n as any).type === "PROCESS"
  );
  const graduationNodes = Object.values(graphState.nodes ?? {}).filter(
    (n): n is GraduationNode => (n as any).type === "GRADUATION"
  );

  const perProcessContributions = processNodes
    .filter((p) => p.computedTimePerUnit !== undefined)
    .map((p) => ({
      processId: p.id,
      processLabel: p.label,
      minutesPerUnit: p.computedTimePerUnit!.amount,
    }));

  const totalMinutesPerUnit = perProcessContributions.reduce(
    (sum, c) => sum + c.minutesPerUnit,
    0
  );

  const now = new Date().toISOString();
  const results: {
    [graduationNodeId: string]: {
      computedProcessTime: { amount: number; unit: string };
      processTimeAudit: GraduationProcessTimeAudit;
    };
  } = {};

  for (const g of graduationNodes) {
    const graduationAmount = g.amount ?? 0;
    const resultAmount = totalMinutesPerUnit * graduationAmount;
    results[g.id] = {
      computedProcessTime: { amount: resultAmount, unit: TARGET_QUOTIENT },
      processTimeAudit: {
        computedAt: now,
        graduationLabel: g.label,
        graduationAmount,
        perProcessContributions,
        totalMinutesPerUnit,
        result: { amount: resultAmount, unit: TARGET_QUOTIENT },
      },
    };
  }

  return results;
}
