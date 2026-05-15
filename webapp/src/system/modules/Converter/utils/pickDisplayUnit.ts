import type { ConversionGraph, UnitValue } from "../typings";
import { convert } from "./convert";

// "At most 2 integer digits" => the displayed number must stay below 100.
const MAX_DISPLAY = 100;

/**
 * Picks the unit within `value`'s scale that keeps the displayed number to at
 * most 2 integer digits: steps down to a smaller unit when the value is < 1,
 * up to a larger unit when it has more than 2 integer digits.
 *
 * Display-only — the returned `amount` is the exact converted value, with no
 * rounding applied. Never throws: on any missing scale, sibling, or conversion
 * path the input is returned unchanged.
 */
export function pickDisplayUnit(
  conversionGraph: ConversionGraph,
  value: UnitValue
): UnitValue {
  if (
    !conversionGraph ||
    !Number.isFinite(value.amount) ||
    value.amount === 0
  ) {
    return value;
  }

  // Scale the unit belongs to.
  const belongsEdge = Object.values(conversionGraph.edges).find(
    (e) => e.type === "BELONGS_TO" && e.sourceId === value.unit
  );
  if (!belongsEdge) return value;
  const scaleId = belongsEdge.targetId;

  // Sibling units in the same scale (including the current unit).
  const siblingUnits = Object.values(conversionGraph.edges)
    .filter((e) => e.type === "BELONGS_TO" && e.targetId === scaleId)
    .map((e) => e.sourceId);

  const candidates: UnitValue[] = [];
  for (const unit of siblingUnits) {
    if (unit === value.unit) {
      candidates.push(value);
      continue;
    }
    try {
      const converted = convert(conversionGraph, value, unit);
      if (
        converted &&
        "amount" in converted &&
        Number.isFinite(converted.amount)
      ) {
        candidates.push({ unit, amount: converted.amount });
      }
    } catch {
      // No usable conversion path to this sibling — skip it.
    }
  }

  if (!candidates.length) return value;

  // Prefer the largest amount that still fits in 2 integer digits. If every
  // candidate already overflows, fall back to the smallest amount (the
  // largest unit) — the closest we can get to the target range.
  const fitting = candidates.filter((c) => Math.abs(c.amount) < MAX_DISPLAY);
  if (fitting.length) {
    return fitting.reduce((best, c) =>
      Math.abs(c.amount) > Math.abs(best.amount) ? c : best
    );
  }
  return candidates.reduce((best, c) =>
    Math.abs(c.amount) < Math.abs(best.amount) ? c : best
  );
}
