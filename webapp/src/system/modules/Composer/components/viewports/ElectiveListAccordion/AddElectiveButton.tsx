import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { GARMENT_ROOT_ID, MODULE_NAME } from "../../../constants";

export default function AddElectiveButton({
  variationId,
}: Readonly<{ variationId: string }>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const { actions } = useVariationActions({ variationId });
  const [name, setName] = useState("");
  const [defaultValue, setDefaultValue] = useState(false);

  const resetForm = () => {
    setName("");
    setDefaultValue(false);
  };

  return (
    <PointerContainer
      onClose={resetForm}
      component={
        <Box
          data-testid="add-elective-form"
          sx={{ minWidth: 320, padding: 2 }}
        >
          <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
            <TextField
              data-testid="add-elective-name"
              label="Nome do Eletivo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
              autoFocus
            />
          </FormControl>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, m: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  data-testid="add-elective-default"
                  checked={defaultValue}
                  onChange={(_, v) => setDefaultValue(v)}
                />
              }
              label="Valor padrão"
            />
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="add-elective-confirm"
          disabled={!name.trim()}
          handleConfirm={() => {
            if (!name.trim()) return;
            actions.addElective(name.trim(), GARMENT_ROOT_ID, defaultValue);
            resetForm();
          }}
        >
          Confirmar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Button
        id="composer-add-elective"
        data-testid="add-elective"
        aria-label="add-elective"
        variant="outlined"
        color="primary"
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/ElectiveList/addElective`}
        >
          <Typography>Adicionar Eletivo</Typography>
        </ShortcutHint>
      </Button>
    </PointerContainer>
  );
}
