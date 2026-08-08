/** Conversion-graph unit ids for the two ends of the production-time figure. */
export const MINUTE_UNIT = "minutos249";
export const DAY_UNIT = "dia251";

/**
 * Format a production time already expressed in days.
 *
 * The minutes → days conversion itself is **not** done here: it goes through
 * the Converter module, so the definition of a day lives in the conversion
 * graph with every other unit rather than being a constant this module invents.
 * See `BudgetDetails`, which resolves the converter once per budget and hands
 * the result down.
 *
 * One decimal: a budget line is an estimate, and that carries as much precision
 * as the underlying per-piece times justify.
 */
export const formatDays = (days: number, abbreviation = "dias"): string => {
  if (!Number.isFinite(days) || days <= 0) return `0 ${abbreviation}`;

  // Below a tenth the rounded value reads "0.0", which looks like nothing at
  // all rather than "a very short run".
  if (days < 0.05) return `< 0.1 ${abbreviation}`;

  const rounded = Math.round(days * 10) / 10;
  return `${rounded.toFixed(1)} ${abbreviation}`;
};

/** Fallback rendering when the converter cannot resolve minutes → days. */
export const formatMinutesFallback = (minutes: number): string =>
  `${Math.round(minutes)} min`;
