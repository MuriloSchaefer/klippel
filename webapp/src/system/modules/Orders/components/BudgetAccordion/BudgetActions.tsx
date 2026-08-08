import Box from "@mui/material/Box";

import CreateBudgetButton from "./CreateBudgetButton";
import AddToBudgetButton from "./AddToBudgetButton";

/**
 * Shown when the open model is not a line in any budget yet.
 */
export default function BudgetActions() {
  return (
    <Box
      id="budget-actions"
      sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}
    >
      <CreateBudgetButton />
      <AddToBudgetButton />
    </Box>
  );
}
