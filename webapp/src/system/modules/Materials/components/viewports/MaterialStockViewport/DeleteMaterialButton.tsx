import React from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import DeleteOutlineSharpIcon from "@mui/icons-material/DeleteOutlineSharp";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { MODULE_NAME } from "../../../constants";

/**
 * Per-row delete trigger. Wraps the trash icon in a `PointerContainer`
 * so the confirmation is a renderer-level popup anchored at the click
 * point — no `window.confirm` / native modal round-trip through the
 * Electron main process. The container's first action is the
 * `ConfirmAndCloseButton`, which doubles as the keyboard
 * confirm-and-close target (mirrors `AddMaterialSection`).
 */
const DeleteMaterialButton: React.FC<{
  id: string;
  onConfirm: (id: string) => void;
  selected?: boolean;
}> = ({ id, onConfirm, selected = false }) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;

  return (
    <PointerContainer
      component={
        <Box
          data-testid={`material-row-delete-confirm-${id}`}
          sx={{
            minWidth: 240,
            padding: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          <Typography variant="subtitle2">Excluir material</Typography>
          <Typography variant="body2" color="text.secondary">
            Tem certeza que deseja excluir &quot;{id}&quot;?
          </Typography>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid={`material-row-delete-accept-${id}`}
          handleConfirm={() => onConfirm(id)}
        >
          Excluir
        </ConfirmAndCloseButton>,
      ]}
    >
      <Tooltip title="Excluir">
        <IconButton
          size="small"
          color="error"
          id={`material-row-delete-${id}`}
          aria-label={`delete-material-${id}`}
          data-testid={`material-row-delete-${id}`}
        >
          {selected ? (
            <ShortcutHint
              shortcutId={`${MODULE_NAME}/MaterialStockViewport/deleteSelected`}
              placement="bottom-center"
            >
              <DeleteOutlineSharpIcon fontSize="small" />
            </ShortcutHint>
          ) : (
            <DeleteOutlineSharpIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
};

// Memoized: the grid re-renders every visible cell on each selection change
// (MUI updates its internal context), but only the rows whose `selected`
// flips need to re-render this popup subtree. Without memo all ~13 visible
// rows re-render their Tooltip/Popper on every arrow keypress.
export default React.memo(DeleteMaterialButton);
