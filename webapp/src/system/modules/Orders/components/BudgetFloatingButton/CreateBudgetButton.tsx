import { useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";

import { labels } from "./constants";

type CreateBudgetForm = {
  label: string;
  color: string;
};

export default function CreateBudgetButton() {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const [form, setForm] = useState<CreateBudgetForm>({label:"", color: ''})


  return (
    <PointerContainer
      actions={[
        <ConfirmAndCloseButton
          type="submit"
          value={"Submit"}
          color="success"
          key="accept"
          handleConfirm={() => console.log("create budget")}
        />,
      ]}
      component={
        <Box>
          <TextField
            id="part-name"
            label="Nome"
            variant="standard"
            value={form.label}
            onChange={(v) =>
              setForm((curr) => ({ ...curr, label: v.target.value }))
            }
          />
        </Box>
      }
    >
      <Button>{labels["create-budget"]}</Button>
    </PointerContainer>
  );
}
