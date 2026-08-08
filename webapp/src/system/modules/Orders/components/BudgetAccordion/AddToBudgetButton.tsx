import { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { Store } from "@kernel/modules/Store";

import BudgetSelector from "../BudgetSelector";
import useBudgetManager from "../../hooks/useBudgetManager";
import { listBudgets } from "../../store/budgets/selectors";
import { ADD_TO_BUDGET_SHORTCUT_ID } from "../../constants";

export default function AddToBudgetButton() {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const storeModule = useModule<Store>("Store");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { useAppSelector } = storeModule.hooks;

  const [budgetId, setBudgetId] = useState("");
  const budgets = useAppSelector(listBudgets());

  const manager = useBudgetManager();

  const handleAddToBudget = useCallback(() => {
    if (!budgetId) return;
    manager.addToBudget(budgetId);
    setBudgetId("");
  }, [budgetId, manager]);

  // Nothing to add to yet — say so rather than opening an empty selector.
  if (budgets.length === 0)
    return (
      <Typography
        id="add-to-budget-empty"
        variant="caption"
        color="text.secondary"
      >
        Nenhum orçamento existente
      </Typography>
    );

  return (
    <PointerContainer
      onClose={() => setBudgetId("")}
      actions={[
        <ConfirmAndCloseButton
          type="submit"
          id="add-to-budget-confirm"
          data-testid="add-to-budget-confirm"
          value={"Submit"}
          color="success"
          key="accept"
          disabled={!budgetId}
          handleConfirm={handleAddToBudget}
        />,
      ]}
      component={
        <Box data-testid="add-to-budget-form" sx={{ p: 1, minWidth: 240 }}>
          <BudgetSelector
            value={budgetId}
            onChange={(evt) => setBudgetId(evt.target.value as string)}
            sx={{ width: "100%" }}
          />
        </Box>
      }
    >
      <Button
        id="add-to-budget"
        data-testid="add-to-budget"
        aria-label="add-to-budget"
        variant="outlined"
        color="info"
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={ADD_TO_BUDGET_SHORTCUT_ID}
        >
          <Typography>Adicionar a orçamento</Typography>
        </ShortcutHint>
      </Button>
    </PointerContainer>
  );
}
