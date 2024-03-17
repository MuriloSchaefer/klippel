import { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import ListItemText from "@mui/material/ListItemText";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";

import useConverterManager from "../../../hooks/useConverterManager";
import UnitSelector from "../../UnitSelector";

type NewCompositeUnitForm = {
  quotientUnit: string;
  dividendUnit: string;
};
const FORM_INITIAL_STATE: NewCompositeUnitForm = {
  quotientUnit: "",
  dividendUnit: "",
};

export default () => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const manager = useConverterManager((s) => s);

  const [form, setForm] = useState<NewCompositeUnitForm>(FORM_INITIAL_STATE);

  const handleClick = useCallback(() => {
    manager.addCompoundUnit(form.quotientUnit, form.dividendUnit)
    setForm(FORM_INITIAL_STATE);
  }, [form, manager]);

  return (
    <PointerContainer
      component={
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-evenly",
            gap: 1,
          }}
        >
          <UnitSelector
            value={form.quotientUnit}
            onChange={(evt, v) =>
              setForm((old) => ({ ...old, quotientUnit: evt.target.value }))
            }
          />
          <span>/</span>
          <UnitSelector value={form.dividendUnit} 
            onChange={(evt, v) =>
              setForm((old) => ({ ...old, dividendUnit: evt.target.value }))
            }/>
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
