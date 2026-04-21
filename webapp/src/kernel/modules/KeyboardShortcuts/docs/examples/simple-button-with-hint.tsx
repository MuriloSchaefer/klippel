/**
 * Example: Simple Button with Keyboard Shortcut Hint
 * 
 * This is the simplest way to add a keyboard shortcut to a component.
 * The ShortcutHint wrapper handles all positioning and visual feedback automatically.
 * 
 * Use this approach when:
 * - You're adding shortcuts to simple UI elements (Button, IconButton, etc.)
 * - Wrapping the component doesn't break parent functionality
 * - You want minimal code
 */

import React, { useEffect } from 'react';
import Button from '@mui/material/Button';
import useModule from "@kernel/hooks/useModule";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";

export const SaveButton: React.FC<{ onSave: () => void }> = ({ onSave }) => {
  // Step 1: Get the KeyboardShortcuts module and extract needed APIs
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  const { ShortcutHint } = keyboardShortcuts.components;
  
  const handleSave = () => {
    console.log('Save action triggered');
    onSave();
  };
  
  // Step 2: Register the keyboard shortcut when component mounts
  useEffect(() => {
    keyboardManager.functions.registerShortcuts([{
      id: 'example.save',              // Unique identifier
      key: 'Ctrl+s',                   // Keyboard combination
      description: 'Save document',    // Shown in hints overlay
      contextId: 'Global',             // Available everywhere
      action: handleSave,              // Callback function
      enabled: true,                   // Currently active
    }]);
    
    // Step 3: Clean up on unmount (CRITICAL!)
    return () => {
      keyboardManager.functions.unregisterShortcuts(['example.save']);
    };
  }, []);
  
  // Step 4: Render component wrapped with ShortcutHint
  return (
    <ShortcutHint 
      shortcutId="example.save"        // Must match registered shortcut ID
      placement="bottom-right"         // Position of hint badge
    >
      <Button 
        onClick={handleSave} 
        variant="contained"
      >
        Save
      </Button>
    </ShortcutHint>
  );
};

/**
 * Usage:
 * 
 * <SaveButton onSave={() => handleSaveLogic()} />
 * 
 * Visual feedback:
 * - Keyboard hint badge appears on button (if hints enabled)
 * - Badge highlights when Ctrl+s keys are pressed
 * - Click button or press Ctrl+s to trigger save
 */

export default SaveButton;
