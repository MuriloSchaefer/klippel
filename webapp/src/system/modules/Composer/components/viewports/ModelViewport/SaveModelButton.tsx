import { useState } from "react";
import { useDispatch } from "react-redux";
import { Box, FormControl, TextField, Typography } from "@mui/material";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { ILayoutModule } from "@kernel/modules/Layout";
import { MODULE_NAME } from "../../../constants";
import { saveModel } from "../../../store/variations/actions";

/**
 * Save button that prompts for a commit message before persisting the
 * current variation's graph to the Jazz CoValue. Wraps the icon in a
 * PointerContainer so the user enters a message and confirms explicitly —
 * no implicit auto-save.
 */
export default function SaveModelButton({
  variationId,
  disabled = false,
}: Readonly<{ variationId: string; disabled?: boolean }>) {
  const dispatch = useDispatch();
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const activeVP = layoutModule.hooks.useActiveViewport();

  const [message, setMessage] = useState("");
  const reset = () => setMessage("");

  return (
    <PointerContainer
      onClose={reset}
      onConfirm={() => {
        const trimmed = message.trim();
        if (!trimmed) return;
        dispatch(saveModel({ variationId, message: trimmed, viewportName: activeVP?.name }));
        reset();
      }}
      component={
        <Box data-testid="save-model-form" sx={{ minWidth: 320, padding: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Descreva as alterações
          </Typography>
          <FormControl fullWidth size="small">
            <TextField
              autoFocus
              required
              multiline
              minRows={2}
              value={message}
              label="Mensagem"
              data-testid="save-model-message"
              size="small"
              onChange={(e) => setMessage(e.target.value)}
              helperText="Descreva brevemente o que mudou neste salvamento"
            />
          </FormControl>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="save-model-confirm"
          disabled={disabled || !message.trim()}
          handleConfirm={() => {
            const trimmed = message.trim();
            if (!trimmed) return;
            dispatch(saveModel({ variationId, message: trimmed, viewportName: activeVP?.name }));
            reset();
          }}
        >
          Salvar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Box
        id="composer-save-model"
        role="button"
        aria-label="save-model"
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? "true" : "false"}
        sx={{ display: "inline-flex", alignItems: "center", cursor: disabled ? "not-allowed" : "pointer" }}
      >
        <ShortcutHint
          placement="bottom-center"
          shortcutId={`${MODULE_NAME}/ModelViewport/saveModel`}
        >
          <SaveSharpIcon
            fontSize="small"
            sx={{
              opacity: disabled ? 0.4 : 1,
              ":hover": { color: disabled ? "inherit" : "primary.main" },
            }}
          />
        </ShortcutHint>
      </Box>
    </PointerContainer>
  );
}
