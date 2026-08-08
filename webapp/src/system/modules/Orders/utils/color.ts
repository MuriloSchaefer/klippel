const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Budget colours come from `ColorPicker`, but they round-trip through
 * hand-editable session JSON before they are read back — so treat a restored
 * value as untrusted and fall back rather than piping it straight into `sx`.
 */
export const safeBudgetColor = (
  color: string | undefined,
  fallback = "#1976d2",
): string => (color && HEX_COLOR.test(color) ? color : fallback);
