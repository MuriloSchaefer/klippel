import { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";

import { actions } from "./constants";
import { ILayoutModule } from "@kernel/modules/Layout";
import useBudgetManager from "../../hooks/useBudgetManager";
import { useTheme } from "@mui/material";

type CreateBudgetForm = {
  label: string;
  color: string;
};

const info = actions["create-budget"];

export default function CreateBudgetButton() {
  const theme = useTheme();
  const pointerModule = useModule<IPointerModule>("Pointer");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ColorPicker } = layoutModule.components;

  const [form, setForm] = useState<CreateBudgetForm>({ label: "", color: "" });

  const manager = useBudgetManager();

  const handleCreateBudget = useCallback(() => {
    manager.createBudget(form.label, form.color);
  }, [form.color, form.label, manager]);

  return (
    <PointerContainer
      actions={[
        <ConfirmAndCloseButton
          type="submit"
          value={"Submit"}
          color="success"
          key="accept"
          handleConfirm={handleCreateBudget}
        />,
      ]}
      component={
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ColorPicker
            sx={{
              width: "40px",
              height: "40px",
              border: `1px solid ${theme.palette.getContrastText(
                theme.palette.background.default
              )}`,
            }}
            colorChange={(color) =>
              setForm((curr) => ({ ...curr, color: color.hex }))
            }
          />
          <TextField
            id="part-name"
            label="Nome"
            variant="standard"
            value={form.label}
            sx={{minWidth:'100px'}}
            onChange={(v) =>
              setForm((curr) => ({ ...curr, label: v.target.value }))
            }
          />
        </Box>
      }
    >
      <Button color={info.color}>{info.label}</Button>
    </PointerContainer>
  );
}
