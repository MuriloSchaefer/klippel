/**
 * Example: Dynamic Keyboard Shortcuts from Data
 * 
 * This example shows how to register shortcuts dynamically based on
 * component state or data (e.g., menu items, tabs, list items).
 * 
 * Use this when:
 * - Shortcuts are generated from dynamic data
 * - Number of shortcuts changes based on state
 * - Component renders lists/tabs/items that should have shortcuts
 */

import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import useModule from "@kernel/hooks/useModule";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";

interface TabItem {
  id: string;
  label: string;
}

/**
 * Example 1: Tabs with Alt+1, Alt+2, Alt+3 shortcuts
 */
export const TabsWithShortcuts: React.FC = () => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  
  const [activeTab, setActiveTab] = useState(0);
  
  // Dynamic tab data
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: 'tab1', label: 'File' },
    { id: 'tab2', label: 'Edit' },
    { id: 'tab3', label: 'View' },
  ]);
  
  // Step 1: Re-register shortcuts whenever tabs change
  useEffect(() => {
    if (!tabs) return;
    
    // Create shortcut for each tab
    const shortcuts = tabs.map((tab, index) => ({
      id: `layout.ribbon.tab.${tab.id}`,      // Unique ID per tab
      key: `Alt+${index + 1}`,                 // Alt+1, Alt+2, Alt+3, etc.
      description: `Switch to ${tab.label} tab`,
      contextId: 'Global',
      action: () => setActiveTab(index),       // Set active tab
      enabled: true,
    }));
    
    // Register all shortcuts
    keyboardManager.functions.registerShortcuts(shortcuts);
    
    // Cleanup old shortcuts on unmount or data change
    return () => {
      const ids = shortcuts.map(s => s.id);
      keyboardManager.functions.unregisterShortcuts(ids);
    };
  }, [tabs]);  // Re-register when tabs change
  
  const handleAddTab = () => {
    const newTab: TabItem = {
      id: `tab${tabs.length + 1}`,
      label: `Tab ${tabs.length + 1}`,
    };
    setTabs([...tabs, newTab]);
  };
  
  const handleRemoveTab = (index: number) => {
    const newTabs = tabs.filter((_, i) => i !== index);
    setTabs(newTabs);
    if (activeTab >= newTabs.length) {
      setActiveTab(Math.max(0, newTabs.length - 1));
    }
  };
  
  return (
    <Box>
      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
        {tabs.map((tab) => (
          <Tab key={tab.id} label={tab.label} />
        ))}
      </Tabs>
      
      <Box sx={{ p: 2 }}>
        <p>Try Alt+1, Alt+2, Alt+3 to switch tabs</p>
        <button onClick={handleAddTab}>Add Tab</button>
        {activeTab < tabs.length && (
          <button onClick={() => handleRemoveTab(activeTab)}>
            Remove Tab
          </button>
        )}
      </Box>
    </Box>
  );
};

/**
 * Example 2: Menu items with Alt+A, Alt+B, Alt+C shortcuts
 */
export const MenuWithShortcuts: React.FC = () => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  
  interface MenuItem {
    id: string;
    label: string;
    action: () => void;
  }
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { id: 'new', label: 'New', action: () => console.log('New') },
    { id: 'open', label: 'Open', action: () => console.log('Open') },
    { id: 'close', label: 'Close', action: () => console.log('Close') },
  ]);
  
  useEffect(() => {
    const shortcuts = menuItems.map((item, index) => ({
      id: `menu.${item.id}`,
      key: `Alt+${String.fromCharCode(65 + (index % 26))}`,  // Alt+A, B, C, etc.
      description: item.label,
      contextId: 'Global',
      action: item.action,
      enabled: true,
    }));
    
    keyboardManager.functions.registerShortcuts(shortcuts);
    
    return () => {
      keyboardManager.functions.unregisterShortcuts(shortcuts.map(s => s.id));
    };
  }, [menuItems]);
  
  return (
    <Box sx={{ border: '1px solid #ccc', p: 1 }}>
      <h3>File Menu</h3>
      {menuItems.map((item) => (
        <button key={item.id} onClick={item.action} style={{ display: 'block' }}>
          {item.label}
        </button>
      ))}
    </Box>
  );
};

/**
 * Example 3: List items with dynamic shortcuts
 */
export const ListWithShortcuts: React.FC = () => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  
  interface ListItem {
    id: string;
    text: string;
  }
  
  const [items, setItems] = useState<ListItem[]>([
    { id: '1', text: 'Item 1' },
    { id: '2', text: 'Item 2' },
    { id: '3', text: 'Item 3' },
  ]);
  
  const [selectedId, setSelectedId] = useState<string>('1');
  
  useEffect(() => {
    const shortcuts = items.map((item) => ({
      id: `list.select.${item.id}`,
      key: `Ctrl+${items.indexOf(item) + 1}`,  // Ctrl+1, Ctrl+2, Ctrl+3
      description: `Select ${item.text}`,
      contextId: 'Global',
      action: () => setSelectedId(item.id),
      enabled: true,
    }));
    
    keyboardManager.functions.registerShortcuts(shortcuts);
    
    return () => {
      keyboardManager.functions.unregisterShortcuts(shortcuts.map(s => s.id));
    };
  }, [items]);
  
  return (
    <Box sx={{ p: 2 }}>
      <h3>List Items (Ctrl+1, Ctrl+2, Ctrl+3)</h3>
      <Box sx={{ border: '1px solid #ccc', p: 1 }}>
        {items.map((item) => (
          <Box
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            sx={{
              p: 1,
              cursor: 'pointer',
              backgroundColor: selectedId === item.id ? '#e0e0e0' : 'transparent',
              '&:hover': { backgroundColor: '#f0f0f0' },
            }}
          >
            {item.text}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/**
 * Key patterns for dynamic shortcuts:
 * 
 * 1. Create shortcuts array by mapping over data
 * 2. Use dynamic IDs: `${moduleId}.${itemId}`
 * 3. Use dynamic keys: Alt+1, Alt+2, Ctrl+1, Ctrl+2, etc.
 * 4. Include data in useEffect dependencies array
 * 5. Generate callback that closes over current state
 * 
 * Important:
 * - Re-register shortcuts when data changes
 * - Unregister old shortcuts in cleanup
 * - Use useCallback for action functions to avoid excessive re-renders
 * - Keep dependency array accurate
 * 
 * Common patterns:
 * - Tab switching: Alt+N where N = index + 1
 * - Menu items: Alt+A, Alt+B, Alt+C
 * - List selection: Ctrl+N where N = index + 1
 */

export default TabsWithShortcuts;
