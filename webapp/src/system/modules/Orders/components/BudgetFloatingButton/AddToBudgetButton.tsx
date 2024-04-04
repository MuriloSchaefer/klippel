import { useCallback, useState } from "react";
import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import { Button } from "@mui/material";
import { actions } from "./constants";
import BudgetSelector from "../BudgetSelector";
import useBudgetManager from "../../hooks/useBudgetManager";

const info = actions["add-to-budget"];

export default function AddToBudgetButton() {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const [budgetId, setBudgetId] = useState("");

  const manager = useBudgetManager();

  const handleAddToBudget = useCallback(
    () => manager.addTobudget(budgetId),
    [budgetId, manager]
  );

  return (
    <PointerContainer
      actions={[
        <ConfirmAndCloseButton
          type="submit"
          value={"Submit"}
          color="success"
          key="accept"
          handleConfirm={handleAddToBudget}
        />,
      ]}
      component={
        <>
          <BudgetSelector
            value={budgetId}
            onChange={(evt) => setBudgetId(evt.target.value)}
            sx={{ width: "100%" }}
          />
        </>
      }
    >
      <Button color={info.color}>{info.label}</Button>
    </PointerContainer>
  );
}
