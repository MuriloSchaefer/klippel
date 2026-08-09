import React from "react";

import Box from "@mui/material/Box";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";

import { BudgetItemState } from "../../store/state";
import { formatDays, formatMinutesFallback } from "../../utils/duration";
import { budgetItemAmount } from "../../utils/quantity";

export type BudgetItemRowProps = Readonly<{
  item: BudgetItemState;
  /** True when this row is the item the active viewport is linked to. */
  current: boolean;
  /** Viewport showing this item, when one is open. */
  viewportName?: string;
  moneyAbbr: string;
  dayAbbr: string;
  /**
   * Minutes → days via the Converter, resolved by the parent. `undefined` when
   * the conversion graph cannot bridge the two units.
   */
  minutesToDays: (minutes: number) => number | undefined;
  onSelect: (viewportName: string) => void;
}>;

const formatMoney = (value: number) => value.toFixed(2);

/**
 * One budget line: name, quantity, total cost (`unitCost × amount`) and
 * production time (`unitMinutes × amount`, converted to days).
 *
 * The quantity is read-only and comes from the item's grade curve
 * (`budgetItemAmount`) — a run of garments is graded, so there is nothing to
 * type here. `unitCost` and `unitMinutes` are the snapshots taken when the item
 * was added; when either is absent the line says so ("não precificado" /
 * "não calculada") rather than showing 0, so an unpriced or untimed piece is
 * never mistaken for a free or instantaneous one.
 *
 * The `data-budget-item-total-minutes` mirror stays in **minutes** — the raw
 * figure, independent of how a day is defined — so tests assert the number, not
 * the presentation.
 *
 * Kept deliberately cheap: no ripple on the row button, and every line renders
 * at once (no virtualization). An earlier revision put a MUI `TextField` per row
 * for the editable amount, which cost ~6x on the `budget-items-render` perf
 * surface at 1 000 items; the quantity being derived removes the input
 * altogether.
 */
function BudgetItemRow({
  item,
  current,
  viewportName,
  moneyAbbr,
  dayAbbr,
  minutesToDays,
  onSelect,
}: BudgetItemRowProps) {
  const amount = budgetItemAmount(item);
  const total = item.unitCost !== undefined ? item.unitCost * amount : undefined;
  // Production time for the whole line, not per piece — what a budget is
  // actually planned against.
  const totalMinutes =
    item.unitMinutes !== undefined ? item.unitMinutes * amount : undefined;

  // Days come from the conversion graph. If it has no minutes → days path the
  // raw minutes are shown instead — a worse unit beats a missing number.
  const totalDays = totalMinutes !== undefined ? minutesToDays(totalMinutes) : undefined;
  const productionTime =
    totalMinutes === undefined
      ? undefined
      : totalDays !== undefined
        ? formatDays(totalDays, dayAbbr)
        : formatMinutesFallback(totalMinutes);

  // Where the quantity came from. It always adds up to `amount` now — the
  // amount *is* this sum — so the breakdown shows whenever there is a curve.
  const gradesTotal = item.grades?.reduce((sum, g) => sum + g.amount, 0);
  const gradeCurve = item.grades?.length
    ? item.grades.map((g) => `${g.label} ${g.amount}`).join(" · ")
    : undefined;

  return (
    <ListItem
      id={`budget-item-${item.itemId}`}
      data-testid="budget-item"
      data-budget-item-label={item.label}
      data-budget-item-id={item.itemId}
      data-budget-item-current={current}
      data-budget-item-amount={amount}
      data-budget-item-total={total !== undefined ? formatMoney(total) : ""}
      data-budget-item-grades-total={gradesTotal ?? ""}
      data-budget-item-total-minutes={
        totalMinutes !== undefined ? totalMinutes.toFixed(2) : ""
      }
      disablePadding
      aria-label={`Item ${item.label}. Quantidade: ${amount}. Total: ${
        total !== undefined ? `${formatMoney(total)} ${moneyAbbr}` : "não precificado"
      }. Tempo de produção: ${
        productionTime ?? "não calculado"
      }`}
      sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1 }}
    >
      <ListItemButton
        tabIndex={0}
        disableRipple
        disabled={!viewportName}
        selected={current}
        onClick={() => viewportName && onSelect(viewportName)}
        sx={{ minWidth: 0, flex: 1 }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Typography noWrap>{item.label}</Typography>
          <Typography
            data-testid="budget-item-total"
            variant="caption"
            color="text.secondary"
          >
            {total !== undefined
              ? `total: ${formatMoney(total)} ${moneyAbbr}`
              : "total: não precificado"}
          </Typography>
          {gradeCurve ? (
            <Typography
              data-testid="budget-item-grades"
              variant="caption"
              color="text.secondary"
            >
              {`grade: ${gradeCurve}`}
            </Typography>
          ) : null}
          <Typography
            data-testid="budget-item-total-time"
            variant="caption"
            color="text.secondary"
          >
            {productionTime
              ? `produção: ${productionTime}`
              : "produção: não calculada"}
          </Typography>
        </Box>
      </ListItemButton>

      <Typography
        id={`budget-item-amount-${item.itemId}`}
        data-testid="budget-item-amount"
        aria-label={`Quantidade de ${item.label}`}
        variant="body2"
        sx={{
          minWidth: "4ch",
          flexShrink: 0,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {amount}
      </Typography>
    </ListItem>
  );
}

// Rows are rendered en masse and only change when their own item does.
export default React.memo(BudgetItemRow);
