import type { CompoundValue } from "@system/modules/Converter/typings";

/**
 * Every process must define a time cost — a step that takes no time is not a
 * step, and the whole chain downstream depends on it: `computedTimePerUnit` is
 * derived from `costTime`, and a process priced per minute cannot be turned
 * into money without it.
 *
 * Money is deliberately *not* checked here: a step may legitimately be
 * unpriced, and the cost accordion reports that as "não definido".
 */
export const hasValidCostTime = (costTime?: CompoundValue): boolean => {
  if (!costTime?.quotient || !costTime?.dividend) return false;
  const { quotient, dividend } = costTime;
  return (
    Number.isFinite(quotient.amount) &&
    Number.isFinite(dividend.amount) &&
    quotient.amount > 0 &&
    dividend.amount > 0 &&
    !!quotient.unit &&
    !!dividend.unit
  );
};

export const COST_TIME_REQUIRED_MESSAGE =
  "Informe o tempo necessário (maior que zero).";
