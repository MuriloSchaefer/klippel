import type { CompoundValue } from "@system/modules/Converter/typings";

const UNITARIO = "unitario18";
const DEFAULT_TEMPORAL = "minutos249";

// Enforces that exactly one side of a process cost-time is the unitary unit
// and the other is a temporal unit. When the user picks values that make both
// sides unitary or both sides temporal, snap the side they didn't touch to
// the complementary kind so the invariant holds.
export function snapCostTime(prev: CompoundValue, next: CompoundValue): CompoundValue {
  const qIsUnitary = next.quotient.unit === UNITARIO;
  const dIsUnitary = next.dividend.unit === UNITARIO;
  const quotientChanged = next.quotient.unit !== prev.quotient.unit;

  if (qIsUnitary && dIsUnitary) {
    return quotientChanged
      ? { ...next, dividend: { amount: 1, unit: DEFAULT_TEMPORAL } }
      : { ...next, quotient: { amount: 1, unit: DEFAULT_TEMPORAL } };
  }
  if (!qIsUnitary && !dIsUnitary) {
    return quotientChanged
      ? { ...next, dividend: { amount: 1, unit: UNITARIO } }
      : { ...next, quotient: { amount: 1, unit: UNITARIO } };
  }
  return next;
}
