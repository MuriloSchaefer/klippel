import React, { useCallback, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";

import { BudgetItemState } from "../../store/state";
import { formatDays, formatMinutesFallback } from "../../utils/duration";

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
  onAmountChange: (itemId: string, amount: number) => void;
}>;

const formatMoney = (value: number) => value.toFixed(2);

/**
 * One budget line: name, amount, total cost (`unitCost × amount`) and
 * production time (`unitMinutes × amount`, converted to days).
 *
 * The amount is editable inline — a read-only amount would be stuck at the 1 it
 * is created with, which makes both totals meaningless. `unitCost` and
 * `unitMinutes` are the snapshots taken when the item was added; when either is
 * absent the line says so ("não precificado" / "não calculada") rather than
 * showing 0, so an unpriced or untimed piece is never mistaken for a free or
 * instantaneous one.
 *
 * The `data-budget-item-total-minutes` mirror stays in **minutes** — the raw
 * figure, independent of how a day is defined — so tests assert the number, not
 * the presentation.
 *
 * Kept deliberately cheap: a native `input` rather than a MUI `TextField`, and
 * no ripple on the row button. A budget renders every line at once (no
 * virtualization), and `TextField` per row cost ~6x on the
 * `budget-items-render` perf surface at 1 000 items.
 */
function BudgetItemRow({
  item,
  current,
  viewportName,
  moneyAbbr,
  dayAbbr,
  minutesToDays,
  onSelect,
  onAmountChange,
}: BudgetItemRowProps) {
  // Local draft so the field can be cleared mid-edit without the store seeing
  // an empty amount.
  const [draft, setDraft] = useState(String(item.amount ?? 1));
  useEffect(() => setDraft(String(item.amount ?? 1)), [item.amount]);

  const commit = useCallback(
    (raw: string) => {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        setDraft(String(item.amount ?? 1));
        return;
      }
      if (parsed !== item.amount) onAmountChange(item.itemId, parsed);
    },
    [item.amount, item.itemId, onAmountChange],
  );

  const amount = item.amount ?? 1;
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

  // Where the quantity came from. Shown only while it still matches the curve:
  // once someone overrides the amount by hand, claiming a grade breakdown that
  // no longer adds up would be worse than showing none.
  const gradesTotal = item.grades?.reduce((sum, g) => sum + g.amount, 0);
  const gradeCurve =
    item.grades && gradesTotal === amount
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

      <Box
        component="input"
        id={`budget-item-amount-${item.itemId}`}
        data-testid="budget-item-amount"
        aria-label={`Quantidade de ${item.label}`}
        type="number"
        min={0}
        value={draft}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setDraft(e.target.value)
        }
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => commit(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        sx={{
          width: "6ch",
          flexShrink: 0,
          p: 0.5,
          bgcolor: "transparent",
          color: "text.primary",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          font: "inherit",
          fontSize: "0.875rem",
          "&:focus": { outline: "2px solid", outlineColor: "primary.main" },
        }}
      />
    </ListItem>
  );
}

// Rows are rendered en masse and only change when their own item does.
export default React.memo(BudgetItemRow);
