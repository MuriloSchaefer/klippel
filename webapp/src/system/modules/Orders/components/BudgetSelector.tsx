import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectProps } from "@mui/material/Select";
import Typography from "@mui/material/Typography";

import { listBudgets } from "../store/budgets/selectors";
import { safeBudgetColor } from "../utils/color";

export default function BudgetSelector(props: SelectProps<string>) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const budgets = useAppSelector(listBudgets());
  const selected = budgets.find((budget) => budget.id === props.value);

  return (
    <Select
      {...props}
      id={props.id ?? "budget-selector"}
      data-testid="budget-selector"
      // Mirrors on the Select root (where `data-testid` also lands) so e2e can
      // wait on the *chosen* budget by name rather than reading the combobox's
      // rendered text (e2e-tests.md §2). `inputProps` would put these on the
      // hidden native input instead.
      data-budget-value={selected?.label}
      data-budget-count={budgets.length}
      sx={{ width: "200px", ...props.sx }}
      autoWidth
      inputProps={{ sx: { display: "flex", gap: 1 } }}
    >
      {budgets.map((budget) => (
        <MenuItem
          key={budget.id}
          value={budget.id}
          data-testid={`budget-option-${budget.id}`}
          data-budget-option-label={budget.label}
          sx={{ display: "flex", gap: 1 }}
        >
          <Box
            sx={{
              width: "20px",
              height: "20px",
              // Read off the budget, not off the viewport group: the group's
              // session JSON may not have rehydrated yet, and the old lookup
              // threw when it hadn't.
              backgroundColor: safeBudgetColor(budget.color),
            }}
          />
          <Typography>{budget.label}</Typography>
        </MenuItem>
      ))}
    </Select>
  );
}
