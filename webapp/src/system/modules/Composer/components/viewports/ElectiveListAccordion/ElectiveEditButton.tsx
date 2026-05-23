import { useState } from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import { EditOutlined } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { useVariationActions } from "../../../hooks/useVariationActions";
import type { ElectiveNode } from "../../../typings";
import { MODULE_NAME } from "../../../constants";

export default function ElectiveEditButton({
  node,
  variationId,
  isFocused,
  onClose,
}: {
  node: ElectiveNode;
  variationId: string;
  isFocused: boolean;
  onClose?: () => void;
}) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const { actions } = useVariationActions({ variationId });

  const [name, setName] = useState<string>(node.label ?? "");
  const [defaultValue, setDefaultValue] = useState<boolean>(!!node.defaultValue);

  return (
    <PointerContainer
      onClose={() => onClose?.()}
      component={
        <Box
          data-testid="edit-elective-form"
          sx={{ minWidth: 320, padding: 2 }}
        >
          <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
            <TextField
              data-testid="edit-elective-name"
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
                  data-testid="edit-elective-default"
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
          data-testid="edit-elective-confirm"
          disabled={!name.trim()}
          handleConfirm={() => {
            if (!name.trim()) return;
            actions.updateElective(node.id, {
              label: name.trim(),
              defaultValue,
            });
          }}
        >
          Salvar
        </ConfirmAndCloseButton>,
      ]}
    >
      <IconButton
        data-testid="elective-item-edit"
        aria-label="edit-elective"
        sx={{ "&:hover": { color: "primary.main" } }}
      >
        <ShortcutHint
          placement="bottom-center"
          shortcutId={`${MODULE_NAME}/ElectiveItem/editElective`}
          alwaysShow={isFocused}
        >
          <EditOutlined color="info" />
        </ShortcutHint>
      </IconButton>
    </PointerContainer>
  );
}
