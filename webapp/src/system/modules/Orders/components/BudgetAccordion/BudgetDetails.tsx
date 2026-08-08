import { useCallback, useMemo } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Typography from "@mui/material/Typography";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { Store } from "@kernel/modules/Store";
import { selectViewportStates } from "@kernel/modules/Layout/store/viewports/selectors";
import type { IConverterModule } from "@system/modules/Converter";

import useBudgetManager from "../../hooks/useBudgetManager";
import { BudgetState } from "../../store/state";
import { safeBudgetColor } from "../../utils/color";
import { DAY_UNIT, MINUTE_UNIT } from "../../utils/duration";
import BudgetItemRow from "./BudgetItemRow";

type BudgetDetailsProps = Readonly<{
  budget: BudgetState;
  itemId?: string;
}>;

/**
 * Shown when the open model is a line in a budget: which budget, which sibling
 * items, and how to leave or delete it.
 */
export default function BudgetDetails({ budget, itemId }: BudgetDetailsProps) {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const pointerModule = useModule<IPointerModule>("Pointer");
  const storeModule = useModule<Store>("Store");

  const converterModule = useModule<IConverterModule>("Converter");

  const { useViewportManager } = layoutModule.hooks;
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { useAppSelector } = storeModule.hooks;
  const { useUnits, useConverter } = converterModule.hooks;

  const viewportManager = useViewportManager();
  const viewports = useAppSelector(selectViewportStates);
  const manager = useBudgetManager();

  const items = useMemo(
    () =>
      Object.values(budget.items ?? {}).sort((a, b) => a.addedAt - b.addedAt),
    [budget.items]
  );

  // Item → the viewport currently showing it, when one is open.
  const viewportByItem = useMemo(() => {
    return Object.values(viewports ?? {}).reduce<{ [item: string]: string }>(
      (acc, vp) => {
        const linked = vp.extra?.budgetItemId as string | undefined;
        return linked ? { ...acc, [linked]: vp.name } : acc;
      },
      {}
    );
  }, [viewports]);

  const handleRemove = useCallback(() => {
    if (itemId) manager.removeFromBudget(budget.id, itemId);
  }, [budget.id, itemId, manager]);

  const handleAmountChange = useCallback(
    (id: string, amount: number) => manager.setAmount(budget.id, id, amount),
    [budget.id, manager],
  );

  // Costs are snapshotted in reais (`reais11`); show the unit's own
  // abbreviation so the label follows the Converter's configuration.
  const units = useUnits([MINUTE_UNIT, DAY_UNIT, "reais11"] as string[]);
  const moneyAbbr = units?.["reais11"]?.abbreviation || "R$";
  const dayAbbr = units?.[DAY_UNIT]?.abbreviation || "dias";

  // Production time is stored in minutes and shown in days. The conversion goes
  // through the Converter so the definition of a day comes from the conversion
  // graph, not from a constant hard-coded here.
  //
  // Resolved once per budget rather than per row: `useConverter` in every
  // `BudgetItemRow` would multiply the work across a list that renders every
  // line at once (see the `budget-items-render` perf surface).
  const converter = useConverter();
  const minutesToDays = useCallback(
    (minutes: number): number | undefined => {
      try {
        const converted = converter?.convert(
          { amount: minutes, unit: MINUTE_UNIT },
          DAY_UNIT,
        );
        // A unit target always converts to a `UnitValue`; the guard is for the
        // no-path case, where `convert` yields nothing.
        if (!converted || !("amount" in converted)) return undefined;
        return Number.isFinite(converted.amount) ? converted.amount : undefined;
      } catch {
        return undefined;
      }
    },
    [converter],
  );

  const handleDelete = useCallback(
    () => manager.deleteBudget(budget.id),
    [budget.id, manager]
  );

  const color = safeBudgetColor(budget.color);

  return (
    <Box>
      <Box
        id="budget-header"
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
        aria-label={`Orçamento ${budget.label}, ${items.length} ${
          items.length === 1 ? "item" : "itens"
        }`}
      >
        <Box
          id="budget-color-swatch"
          data-color={color}
          sx={{
            width: 16,
            height: 16,
            borderRadius: "2px",
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        <Typography id="budget-label" sx={{ fontWeight: 600 }}>
          {budget.label}
        </Typography>
        <Typography id="budget-item-count" variant="caption" color="text.secondary">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </Typography>
      </Box>

      <List id="budget-item-list" sx={{ p: 0 }} aria-label="Itens do orçamento">
        {items.map((item) => (
          <BudgetItemRow
            key={item.itemId}
            item={item}
            current={item.itemId === itemId}
            viewportName={viewportByItem[item.itemId]}
            moneyAbbr={moneyAbbr}
            dayAbbr={dayAbbr}
            minutesToDays={minutesToDays}
            onSelect={(name) =>
              viewportManager.functions.selectViewport(name)
            }
            onAmountChange={handleAmountChange}
          />
        ))}
      </List>

      <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
        <Button
          id="remove-from-budget"
          data-testid="remove-from-budget"
          aria-label="remove-from-budget"
          size="small"
          variant="outlined"
          color="warning"
          disabled={!itemId}
          onClick={handleRemove}
        >
          Remover do orçamento
        </Button>

        <PointerContainer
          component={
            <Typography sx={{ p: 1 }}>
              Deletar o orçamento "{budget.label}"? As peças continuam abertas.
            </Typography>
          }
          actions={[
            <ConfirmAndCloseButton
              key="confirm-delete"
              id="delete-budget-confirm"
              data-testid="delete-budget-confirm"
              color="error"
              handleConfirm={handleDelete}
            />,
          ]}
        >
          <Button
            id="delete-budget"
            data-testid="delete-budget"
            aria-label="delete-budget"
            size="small"
            variant="outlined"
            color="error"
          >
            Deletar orçamento
          </Button>
        </PointerContainer>
      </Box>
    </Box>
  );
}
