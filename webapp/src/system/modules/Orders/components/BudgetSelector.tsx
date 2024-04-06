import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectProps } from "@mui/material/Select";
import Typography from "@mui/material/Typography";

import { listBudgets } from "../store/budgets/selectors";
import { ILayoutModule } from "@kernel/modules/Layout";

export default function BudgetSelector(props: SelectProps<string>) {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { useAppSelector } = storeModule.hooks;
  const { getViewportGroups } = layoutModule.store.selectors;

  const budgets = useAppSelector(listBudgets());
  const vpGroups = useAppSelector(getViewportGroups);

  return (
    <Select
      {...props}
      sx={{ width: "200px", ...props.sx }}
      autoWidth
      inputProps={{ sx: { display: "flex", gap: 1 } }}
    >
      {budgets.map((budget) => (
        <MenuItem
          key={budget.id}
          value={budget.id}
          sx={{ display: "flex", gap: 1 }}
        >
          <Box
            sx={{
              width: "20px",
              height: "20px",
              backgroundColor: vpGroups[budget.viewportGroup].color,
            }}
          />
          <Typography
          // secondary={secondary ? "Secondary text" : null}
          >
            {budget.label}
          </Typography>
        </MenuItem>
      ))}
    </Select>
  );
}
