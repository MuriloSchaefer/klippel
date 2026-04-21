/**
 * Example: Context-Scoped Keyboard Shortcuts
 * 
 * This example shows how to scope shortcuts to specific UI contexts,
 * so they only activate when that context is active.
 * 
 * Use this when:
 * - Shortcuts should only work in specific panels/modes
 * - You want to avoid conflicts with global shortcuts
 * - You have multiple editors/tools with different shortcuts
 */

import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import useModule from "@kernel/hooks/useModule";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";

/**
 * Step 1: Create a context provider wrapper
 * 
 * This establishes a context scope. Shortcuts registered with this contextId
 * will only be active when inside a ShortcutProvider with that contextId.
 */
export const EditorPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const { ShortcutProvider } = keyboardShortcuts.components;
  
  return (
    <ShortcutProvider contextId="EditorPanel">
      {children}
    </ShortcutProvider>
  );
};

/**
 * Step 2: Register context-specific shortcuts inside the provider
 */
export const EditorContent: React.FC = () => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  const { ShortcutHint } = keyboardShortcuts.components;
  
  const handleUndo = () => console.log('Undo in editor');
  const handleRedo = () => console.log('Redo in editor');
  const handleFormat = () => console.log('Format in editor');
  
  useEffect(() => {
    // Register shortcuts with 'EditorPanel' context
    // These shortcuts ONLY work inside EditorPanel provider
    keyboardManager.functions.registerShortcuts([
      {
        id: 'editor.undo',
        key: 'Ctrl+z',
        description: 'Undo',
        contextId: 'EditorPanel',  // Scoped to editor context
        action: handleUndo,
        enabled: true,
      },
      {
        id: 'editor.redo',
        key: 'Ctrl+Shift+z',
        description: 'Redo',
        contextId: 'EditorPanel',  // Scoped to editor context
        action: handleRedo,
        enabled: true,
      },
      {
        id: 'editor.format',
        key: 'Ctrl+Alt+f',
        description: 'Format code',
        contextId: 'EditorPanel',  // Scoped to editor context
        action: handleFormat,
        enabled: true,
      },
    ]);
    
    return () => {
      keyboardManager.functions.unregisterShortcuts([
        'editor.undo',
        'editor.redo',
        'editor.format',
      ]);
    };
  }, []);
  
  return (
    <Box sx={{ p: 2 }}>
      <textarea 
        placeholder="Type here. Use Ctrl+Z to undo (only in editor)..."
        style={{ width: '100%', height: '200px' }}
      />
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <ShortcutHint shortcutId="editor.undo">
          <Button onClick={handleUndo}>Undo</Button>
        </ShortcutHint>
        <ShortcutHint shortcutId="editor.redo">
          <Button onClick={handleRedo}>Redo</Button>
        </ShortcutHint>
        <ShortcutHint shortcutId="editor.format">
          <Button onClick={handleFormat}>Format</Button>
        </ShortcutHint>
      </Box>
    </Box>
  );
};

/**
 * Example: Multiple contexts
 */
export const MultiContextExample: React.FC = () => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const { ShortcutProvider } = keyboardShortcuts.components;
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  
  useEffect(() => {
    // Register global shortcuts (available everywhere)
    keyboardManager.functions.registerShortcuts([
      {
        id: 'global.save',
        key: 'Ctrl+s',
        description: 'Save',
        contextId: 'Global',
        action: () => console.log('Global save'),
        enabled: true,
      },
    ]);
    
    return () => {
      keyboardManager.functions.unregisterShortcuts(['global.save']);
    };
  }, []);
  
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      {/* Editor context - Ctrl+Z does undo */}
      <ShortcutProvider contextId="EditorPanel">
        <Box sx={{ border: '1px solid blue', p: 2, flex: 1 }}>
          <h3>Editor Panel</h3>
          <p>Ctrl+Z = Undo</p>
          <p>Ctrl+S = Save (global)</p>
        </Box>
      </ShortcutProvider>
      
      {/* Viewer context - Ctrl+Z might not exist */}
      <ShortcutProvider contextId="ViewerPanel">
        <Box sx={{ border: '1px solid green', p: 2, flex: 1 }}>
          <h3>Viewer Panel</h3>
          <p>Ctrl+Z = (not available here)</p>
          <p>Ctrl+S = Save (global)</p>
        </Box>
      </ShortcutProvider>
    </Box>
  );
};

/**
 * Key points about context-scoped shortcuts:
 * 
 * 1. Shortcuts are only active when their contextId matches the current context
 * 2. Use 'Global' for shortcuts available everywhere
 * 3. Use custom contextIds for feature-specific shortcuts
 * 4. Context stack is managed by ShortcutProvider components
 * 5. Nested providers create a context stack (innermost context wins)
 * 
 * How it works:
 * - ShortcutProvider wraps component and establishes a context scope
 * - Register shortcuts with contextId matching the provider
 * - When keys are pressed, system checks if current context matches
 * - If it matches, the shortcut action is triggered
 * 
 * Advantages:
 * - Avoid conflicts between different features' shortcuts
 * - Same shortcut key can mean different things in different contexts
 * - Automatic scope management with providers
 * - Clear code structure showing where shortcuts are active
 */

export default MultiContextExample;
