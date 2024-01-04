import { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import ListItemText from "@mui/material/ListItemText";
import useConverterManager from "../../../hooks/useConverterManager";
import ScaleSelector from "../../ScaleSelector";

type NewUnitForm = {
  name?: string;
  abbreviation?: string;
  scale?: string;
};
const FORM_INITIAL_STATE: NewUnitForm = {
  name: undefined,
  abbreviation: undefined,
  scale: undefined,
};

export default () => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const manager = useConverterManager((s) => s);

  const [form, setForm] = useState<NewUnitForm>(FORM_INITIAL_STATE);

  const handleClick = useCallback(() => {
    if (!form.name || !form.abbreviation) return;
    manager.addUnit(form.name, form.abbreviation, form.scale);
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
            id="unit-name"
            label="Nome"
            variant="standard"
            value={form.name}
            onChange={(v) =>
              setForm((curr) => ({ ...curr, name: v.target.value }))
            }
          />
          <TextField
            id="abbreviation"
            label="Abbreviation"
            variant="standard"
            value={form.abbreviation}
            onChange={(v) =>
              setForm((curr) => ({ ...curr, abbreviation: v.target.value }))
            }
            sx={{ alignItems: "center" }}
          />
          <ScaleSelector value={form.scale ?? ""} onChange={(v) => setForm(old => ({...old, scale: v}))} />
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton key="confirm" handleConfirm={handleClick} />,
      ]}
    >
      <ListItemText
        primary="Unidade"
        secondary="Adiciona um tipo de unidade simples"
        sx={{
          cursor: "pointer",
          flexGrow: 1,
        }}
      />
    </PointerContainer>
  );
};
