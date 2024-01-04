import { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import ListItemText from "@mui/material/ListItemText";
import useConverterManager from "../../../hooks/useConverterManager";

type NewScaleForm = {
  name?: string;
};
const FORM_INITIAL_STATE: NewScaleForm = {
  name: undefined,
};

export default () => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const manager = useConverterManager((s) => s);

  const [form, setForm] = useState<NewScaleForm>(FORM_INITIAL_STATE);

  const handleClick = useCallback(() => {
    if (!form.name) return;
    manager.addScale(form.name);
    setForm(FORM_INITIAL_STATE);
  }, [form, manager]);

  return (
    <PointerContainer
      component={
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <TextField
            id="part-name"
            label="Nome"
            variant="standard"
            value={form.name}
            onChange={(v) =>
              setForm((curr) => ({ ...curr, name: v.target.value }))
            }
          />
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton key="confirm" handleConfirm={handleClick} />,
      ]}
    >
      <ListItemText
        primary="Escala"
        secondary="Adiciona um tipo de escala"
        sx={{
          cursor: "pointer",
          flexGrow: 1,
        }}
      />
    </PointerContainer>
  );
};
