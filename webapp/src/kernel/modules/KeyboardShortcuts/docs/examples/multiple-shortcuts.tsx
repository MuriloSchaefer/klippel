/**
 * Example: Multiple Shortcuts in One Component
 * 
 * This example demonstrates how to register multiple related keyboard shortcuts
 * in a single component (e.g., editor shortcuts).
 * 
 * Use this when:
 * - Component has many related shortcuts
 * - You want to manage them together for easier maintenance
 * - You need to clean them up as a group
 */

import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import useModule from "@kernel/hooks/useModule";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";

interface EditorState {
  content: string;
  canUndo: boolean;
  canRedo: boolean;
}

export const AdvancedEditor: React.FC = () => {
  // Step 1: Get the KeyboardShortcuts module
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  const { ShortcutHint } = keyboardShortcuts.components;
  
  // Component state
  const [state, setState] = useState<EditorState>({
    content: '',
    canUndo: false,
    canRedo: false,
  });
  
  const handleSave = () => {
    console.log('Document saved');
    // Save logic here
  };
  
  const handleUndo = () => {
    console.log('Undo performed');
    setState(prev => ({ ...prev, canUndo: false }));
  };
  
  const handleRedo = () => {
    console.log('Redo performed');
    setState(prev => ({ ...prev, canRedo: false }));
  };
  
  const handleFind = () => {
    console.log('Find dialog opened');
  };
  
  // Step 2: Register multiple shortcuts together
  useEffect(() => {
    // Create array of related shortcuts
    const shortcuts = [
      {
        id: 'editor.save',
        key: 'Ctrl+s',
        description: 'Save document',
        contextId: 'Global',
        action: handleSave,
        enabled: true,
      },
      {
        id: 'editor.undo',
        key: 'Ctrl+z',
        description: 'Undo last action',
        contextId: 'Global',
        action: handleUndo,
        enabled: state.canUndo,  // Only enabled when there's something to undo
      },
      {
        id: 'editor.redo',
        key: 'Ctrl+Shift+z',
        description: 'Redo last action',
        contextId: 'Global',
        action: handleRedo,
        enabled: state.canRedo,  // Only enabled when there's something to redo
      },
      {
        id: 'editor.find',
        key: 'Ctrl+f',
        description: 'Find in document',
        contextId: 'Global',
        action: handleFind,
        enabled: true,
      },
    ];
    
    // Register all shortcuts
    keyboardManager.functions.registerShortcuts(shortcuts);
    
    // Step 3: Clean up all shortcuts on unmount
    return () => {
      const shortcutIds = shortcuts.map(s => s.id);
      keyboardManager.functions.unregisterShortcuts(shortcutIds);
    };
  }, [state.canUndo, state.canRedo]);  // Re-register when state changes
  
  // Step 4: Render UI with hints
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <ShortcutHint shortcutId="editor.save" placement="bottom-center">
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </ShortcutHint>
      
      <ShortcutHint shortcutId="editor.undo" placement="bottom-center">
        <Button onClick={handleUndo} disabled={!state.canUndo}>
          Undo
        </Button>
      </ShortcutHint>
      
      <ShortcutHint shortcutId="editor.redo" placement="bottom-center">
        <Button onClick={handleRedo} disabled={!state.canRedo}>
          Redo
        </Button>
      </ShortcutHint>
      
      <ShortcutHint shortcutId="editor.find" placement="bottom-center">
        <Button onClick={handleFind}>
          Find
        </Button>
      </ShortcutHint>
    </Box>
  );
};

/**
 * Benefits of this approach:
 * 
 * 1. Group related shortcuts together
 * 2. Easy to maintain and modify all shortcuts for a component
 * 3. Automatic cleanup of all shortcuts on unmount
 * 4. Can enable/disable shortcuts based on component state
 * 5. Single dependencies array to manage all shortcuts
 * 
 * Key pattern:
 * - Create array of shortcut definitions
 * - Register all at once: registerShortcuts(shortcuts)
 * - Unregister all at once: unregisterShortcuts(ids)
 */

export default AdvancedEditor;
