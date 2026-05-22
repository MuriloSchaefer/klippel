import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  TextField,
  Typography,
} from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME } from "../../../constants";

export default function AddGraduationButton({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { actions } = useVariationActions({ variationId });
  const [names, setNames] = useState("");

  async function handleConfirm() {
    const splitNames = names
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (splitNames.length === 0) return;

    actions.addGraduations(splitNames, garmentId);
    setNames("");
  }

  return (
    <PointerContainer
      onClose={() => setNames("")}
      component={
        <Box data-testid="add-graduation-form" sx={{ minWidth: 360, padding: 2 }}>
          <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
            <TextField
              data-testid="add-graduation-names"
              label="Nova(s) Graduação(s) — separadas por vírgula"
              placeholder="Ex: P, M, G ou 34,36,38"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              multiline
              autoFocus
              helperText="Você pode adicionar múltiplas graduações separando por vírgula ','. Elas serão criadas na ordem informada."
            />
          </FormControl>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="add-graduation-confirm"
          disabled={!names.trim()}
          handleConfirm={handleConfirm}
        >
          Adicionar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Button
        id="composer-add-graduation"
        data-testid="add-graduation"
        aria-label="add-graduation"
        variant="outlined"
        color="primary"
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/ModelViewport/addGraduation`}
        >
          <Typography>Adicionar Graduação</Typography>
        </ShortcutHint>
      </Button>
    </PointerContainer>
  );
}
