import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import { Button } from "@mui/material";
import { labels } from "./constants";


export default function AddToBudgetButton() {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  return (
    <PointerContainer
      actions={[
        <ConfirmAndCloseButton
          type="submit"
          value={"Submit"}
          color="success"
          key="accept"
          handleConfirm={() => console.log("add to budget")}
        />,
      ]}
      component={<>test</>}
    >
      <Button>{labels["add-to-budget"]}</Button>
    </PointerContainer>
  );
}
