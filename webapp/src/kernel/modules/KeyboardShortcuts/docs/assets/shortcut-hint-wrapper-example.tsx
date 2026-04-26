/**
 * Example: Using the ShortcutHint wrapper component
 * 
 * The simplest way to add keyboard hints to a component is using
 * the ShortcutHint wrapper. This component handles all the positioning
 * and visual feedback automatically.
 */

import React from "react";
import Button from '@mui/material/Button';
import useModule from "@kernel/hooks/useModule";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";

const ShortcutHintWrapperExample = () => {
  const keyboardShortcutsModule = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;

  return (
    <div>
      {/* Simple example: Wrap any component */}
      <ShortcutHint 
        shortcutId="file.save"
        placement="bottom-right"
      >
        <Button variant="contained">
          Save
        </Button>
      </ShortcutHint>

      {/* Always show hint (ignores global hints toggle) */}
      <ShortcutHint 
        shortcutId="file.new"
        placement="top-right"
        alwaysShow={true}
      >
        <Button variant="outlined">
          New File
        </Button>
      </ShortcutHint>

      {/* Different placements */}
      <ShortcutHint shortcutId="edit.undo" placement="top-left">
        <Button>Undo</Button>
      </ShortcutHint>

      <ShortcutHint shortcutId="edit.redo" placement="bottom-left">
        <Button>Redo</Button>
      </ShortcutHint>
    </div>
  );
};

/**
 * Note: ShortcutHint component is best for simple use cases.
 * For complex layouts (like MUI Tabs) where wrapping breaks functionality,
 * use the manual approach with exported styles (see visual-hints-example.tsx).
 */

export default ShortcutHintWrapperExample;
