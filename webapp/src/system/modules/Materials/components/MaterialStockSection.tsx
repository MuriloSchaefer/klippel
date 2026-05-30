import React, { useCallback } from "react";
import { IconButton, Tooltip } from "@mui/material";
import InventorySharpIcon from "@mui/icons-material/InventorySharp";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { MODULE_NAME } from "../constants";

/**
 * Ribbon entry point for opening a new `MaterialStock` viewport.
 * Mirrors Composer's `ModelSection` pattern: a single icon button
 * that dispatches `addViewport` and lets the viewport itself own its
 * `viewport.extra` state.
 */
const MaterialStockSection: React.FC = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { useViewportManager } = layoutModule.hooks;
  const viewportManager = useViewportManager();

  const handleOpen = useCallback(() => {
    const name = viewportManager.functions.addViewport(
      "Estoque",
      "MaterialStock",
      undefined,
      "materialstock-",
      { view: "table", query: "" },
    );
    viewportManager.functions.selectViewport(name);
  }, [viewportManager]);

  return (
    <Tooltip title="Abrir estoque de materiais">
      <IconButton
        id="open-material-stock"
        data-testid="open-material-stock"
        onClick={handleOpen}
        color="primary"
        aria-label="open-material-stock"
      >
        <ShortcutHint
          shortcutId={`${MODULE_NAME}/Estoque/openStock`}
          placement="bottom-center"
        >
          <InventorySharpIcon />
        </ShortcutHint>
      </IconButton>
    </Tooltip>
  );
};

export default MaterialStockSection;
