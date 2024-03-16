import { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import ListItemText from "@mui/material/ListItemText";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";

import useConverterManager from "../../../hooks/useConverterManager";

type NewCompositeUnitForm = {
  name?: string;
  abbreviation?: string;
  scale?: string;
};
const FORM_INITIAL_STATE: NewCompositeUnitForm = {
  name: undefined,
  abbreviation: undefined,
  scale: undefined,
};

export default () => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const manager = useConverterManager((s) => s);

  const [form, setForm] = useState<NewCompositeUnitForm>(FORM_INITIAL_STATE);

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
          
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton key="confirm" handleConfirm={handleClick} />,
      ]}
    >
      <ListItemText
        primary="Unidade Composta"
        secondary="Adiciona um tipo de unidade composta"
        sx={{
          cursor: "pointer",
          flexGrow: 1,
        }}
      />
    </PointerContainer>
  );
};
