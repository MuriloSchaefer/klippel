/**
 * Example: Adding keyboard shortcuts to RibbonMenu tabs
 * 
 * This example demonstrates how to:
 * 1. Register keyboard shortcuts dynamically based on component state
 * 2. Display visual hints for shortcuts
 * 3. Handle shortcut actions
 */

import React, { useCallback, useEffect, useRef } from "react";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";
import { selectShowHints, selectPressedKeys } from "@kernel/modules/KeyboardShortcuts/store/selectors";

// Placeholder selectors — replace with your module's actual selectors
const selectTabs = (_state: unknown): Record<string, { label: string }> => ({});
const useSelectTab = () => useCallback((_name: string) => {}, []);

const RibbonMenuExample = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const keyboardShortcutsModule = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcutsModule.managers.useKeyboardShortcutsManager();

  const tabs = useAppSelector(selectTabs); // Your tab data from Redux
  const showHints = useAppSelector(selectShowHints);
  const pressedKeys = useAppSelector(selectPressedKeys);
  const selectTab = useSelectTab();

  // Step 1: Register shortcuts when component mounts or data changes
  useEffect(() => {
    if (!tabs) return;

    // Create shortcut definitions
    const shortcuts = Object.entries(tabs).map(([name, tab], index) => ({
      id: `layout.ribbon.tab.${name}`,           // Unique ID using naming convention
      key: `Alt+${index + 1}`,                    // Keyboard combination
      description: `Switch to ${tab.label} tab`, // Human-readable description
      contextId: 'Global',                        // Context (Global, Modal, etc.)
      action: () => {                             // Action to execute
        selectTab(name);
      },
      enabled: true,                              // Initially enabled
    }));

    // Register all shortcuts
    keyboardManager.functions.registerShortcuts(shortcuts);

    // Cleanup: unregister shortcuts when component unmounts
    return () => {
      const shortcutIds = shortcuts.map(s => s.id);
      keyboardManager.functions.unregisterShortcuts(shortcutIds);
    };
  }, [tabs, selectTab, keyboardManager]);

  // Step 2: Display visual hints (optional but recommended)
  // See visual-hints-example.tsx for detailed implementation
  
  return (
    <div>
      {/* Your component UI */}
    </div>
  );
};

export default RibbonMenuExample;
