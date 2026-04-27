import { CompoundValue } from "@system/modules/Converter/typings";
import { ConsumesEdge, ConsumedByEdge } from "../typings";

export function resolveConsumption(
  edge: Pick<ConsumesEdge, "amount" | "consumptionPerGrade">,
  graduationId: string
): CompoundValue {
  return edge.consumptionPerGrade?.[graduationId] ?? edge.amount;
}

export function recomputeGradeDelta(
  amount: CompoundValue,
  override: CompoundValue | undefined
): number | undefined {
  if (!override) return undefined;
  const base = amount.quotient.amount;
  if (base === 0) return undefined;
  // assumes normalised dividends; UI feeds the same dividend by default
  return ((override.quotient.amount - base) / base) * 100;
}

export function recomputeAllGradeDeltas(
  amount: CompoundValue,
  consumptionPerGrade: { [k: string]: CompoundValue } | undefined
): { [k: string]: number } | undefined {
  if (!consumptionPerGrade) return undefined;
  const out: { [k: string]: number } = {};
  for (const [id, v] of Object.entries(consumptionPerGrade)) {
    const d = recomputeGradeDelta(amount, v);
    if (d !== undefined) out[id] = d;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

export function dropGraduationFromEdge<E extends ConsumesEdge | ConsumedByEdge>(
  edge: E,
  graduationId: string
): Partial<E> {
  if (!edge.consumptionPerGrade?.[graduationId]) return {};
  const nextConsumption = { ...edge.consumptionPerGrade };
  delete nextConsumption[graduationId];
  const nextDeltas = edge.gradeDeltas ? { ...edge.gradeDeltas } : undefined;
  if (nextDeltas) delete nextDeltas[graduationId];
  return {
    consumptionPerGrade:
      Object.keys(nextConsumption).length === 0 ? undefined : nextConsumption,
    gradeDeltas:
      nextDeltas && Object.keys(nextDeltas).length === 0
        ? undefined
        : nextDeltas,
  } as Partial<E>;
}
