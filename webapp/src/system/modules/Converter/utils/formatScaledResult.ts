import type { ConversionGraph, UnitValue } from "../typings";
import { pickDisplayUnit } from "./pickDisplayUnit";

export interface ScaledResult {
  amount: number;
  unit: string;
  abbreviation: string;
}

/**
 * Rescales a computed result to the unit in its scale that keeps the number to
 * at most 2 integer digits, and resolves the abbreviation of the chosen unit.
 *
 * No rounding — `amount` is the exact converted value. The abbreviation is read
 * straight from the conversion graph, so it resolves even when the rescaled
 * unit was not part of a component's filtered `useUnits` subset. When the graph
 * is unavailable the input value is passed through unchanged.
 */
export function formatScaledResult(
  conversionGraph: ConversionGraph | undefined,
  value: UnitValue
): ScaledResult {
  const scaled = conversionGraph
    ? pickDisplayUnit(conversionGraph, value)
    : value;
  const node = conversionGraph?.nodes[scaled.unit];
  const abbreviation =
    node && node.type === "UNIT" ? node.abbreviation : scaled.unit;
  return { amount: scaled.amount, unit: scaled.unit, abbreviation };
}
