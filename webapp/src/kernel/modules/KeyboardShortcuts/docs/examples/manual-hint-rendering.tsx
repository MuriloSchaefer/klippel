/**
 * Example: Manual Keyboard Hint Rendering
 * 
 * This example shows how to manually render keyboard hint badges for cases
 * where the ShortcutHint wrapper would break component functionality.
 * 
 * Use this when:
 * - Wrapping with ShortcutHint breaks component layout (MUI Tabs, Grid, etc.)
 * - You need precise control over hint positioning
 * - Component has complex parent constraints
 * - You want to customize hint appearance
 */

import React, { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import useModule from "@kernel/hooks/useModule";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { 
  selectShowHints, 
  selectPressedKeys 
} from "@kernel/modules/KeyboardShortcuts/store/selectors";

/**
 * Example: Tab component with manual hints
 * 
 * We can't wrap Tab with ShortcutHint because it breaks the Tabs indicator.
 * Instead, we render hints manually positioned above/below tabs.
 */
export const TabsWithManualHints: React.FC = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  
  // Get styles from KeyboardShortcuts module
  const { 
    keyboardHintContainerSx,
    keyboardHintKeySx,
    keyboardHintKeyPressedSx,
    keyboardHintSeparatorSx,
  } = keyboardShortcuts.styles;
  
  // Get global state
  const showHints = useAppSelector(selectShowHints);
  const pressedKeys = useAppSelector(selectPressedKeys);
  
  const [activeTab, setActiveTab] = React.useState(0);
  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  
  const tabs = [
    { label: 'Home', shortcutKey: 'Alt+1', id: 'home' },
    { label: 'About', shortcutKey: 'Alt+2', id: 'about' },
    { label: 'Contact', shortcutKey: 'Alt+3', id: 'contact' },
  ];
  
  // Step 1: Register shortcuts
  useEffect(() => {
    const shortcuts = tabs.map((tab, index) => ({
      id: `tabs.${tab.id}`,
      key: tab.shortcutKey,
      description: `Switch to ${tab.label}`,
      contextId: 'Global',
      action: () => setActiveTab(index),
      enabled: true,
    }));
    
    keyboardManager.functions.registerShortcuts(shortcuts);
    
    return () => {
      keyboardManager.functions.unregisterShortcuts(shortcuts.map(s => s.id));
    };
  }, []);
  
  /**
   * Step 2: Create helper to render a hint for a shortcut key
   */
  const renderKeyHint = (shortcutKey: string) => {
    const keyParts = shortcutKey.split('+');
    const isPressed = keyParts.some(part => pressedKeys.includes(part));
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <KeyboardIcon
          sx={{
            fontSize: '10px',
            color: isPressed ? 'secondary.main' : 'rgba(255, 255, 255, 0.4)',
            transition: 'color 0.1s ease-in-out',
          }}
        />
        {keyParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <Box component="span" sx={keyboardHintSeparatorSx}>
                +
              </Box>
            )}
            <Chip
              label={part}
              size="small"
              sx={
                pressedKeys.includes(part)
                  ? keyboardHintKeyPressedSx
                  : keyboardHintKeySx
              }
            />
          </React.Fragment>
        ))}
      </Box>
    );
  };
  
  /**
   * Step 3: Render component with hints
   */
  return (
    <Box sx={{ position: 'relative' }}>
      {/* Hint hints above tabs */}
      {showHints && (
        <Box
          sx={{
            position: 'absolute',
            top: -35,
            left: 0,
            right: 0,
            display: 'flex',
            gap: 1,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          {tabs.map((tab, index) => (
            <Box key={tab.id} sx={{ width: 80 }}>
              {renderKeyHint(tab.shortcutKey)}
            </Box>
          ))}
        </Box>
      )}
      
      {/* Tabs component - not wrapped, so layout is preserved */}
      <Tabs 
        value={activeTab} 
        onChange={(_, value) => setActiveTab(value)}
        sx={{ mt: 4 }}  // Add margin-top to make room for hints
      >
        {tabs.map((tab, index) => (
          <Tab 
            key={tab.id}
            label={tab.label}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
          />
        ))}
      </Tabs>
      
      {/* Tab content */}
      <Box sx={{ p: 2 }}>
        <p>{tabs[activeTab].label} content here</p>
        <p>Try pressing {tabs[activeTab].shortcutKey}</p>
      </Box>
    </Box>
  );
};

/**
 * Example 2: Button with inline hint
 */
export const ButtonWithInlineHint: React.FC = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const { 
    keyboardHintKeySx,
    keyboardHintKeyPressedSx,
    keyboardHintSeparatorSx,
  } = keyboardShortcuts.styles;
  
  const showHints = useAppSelector(selectShowHints);
  const pressedKeys = useAppSelector(selectPressedKeys);
  
  const shortcutKey = 'Ctrl+S';
  const keyParts = shortcutKey.split('+');
  const isPressed = keyParts.some(part => pressedKeys.includes(part));
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <button onClick={() => console.log('Save')}>
        Save
      </button>
      
      {showHints && (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {keyParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <Box component="span" sx={keyboardHintSeparatorSx}>
                  +
                </Box>
              )}
              <Chip
                label={part}
                size="small"
                sx={
                  pressedKeys.includes(part)
                    ? keyboardHintKeyPressedSx
                    : keyboardHintKeySx
                }
              />
            </React.Fragment>
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * Example 3: Grid-based layout with hints
 */
export const GridWithHints: React.FC = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  
  const { 
    keyboardHintContainerSx,
    keyboardHintKeySx,
    keyboardHintKeyPressedSx,
    keyboardHintSeparatorSx,
  } = keyboardShortcuts.styles;
  
  const showHints = useAppSelector(selectShowHints);
  const pressedKeys = useAppSelector(selectPressedKeys);
  
  interface GridItem {
    id: string;
    label: string;
    shortcutKey: string;
  }
  
  const items: GridItem[] = [
    { id: '1', label: 'Item 1', shortcutKey: 'Ctrl+1' },
    { id: '2', label: 'Item 2', shortcutKey: 'Ctrl+2' },
    { id: '3', label: 'Item 3', shortcutKey: 'Ctrl+3' },
    { id: '4', label: 'Item 4', shortcutKey: 'Ctrl+4' },
  ];
  
  const [selectedId, setSelectedId] = React.useState('1');
  
  useEffect(() => {
    const shortcuts = items.map(item => ({
      id: `grid.${item.id}`,
      key: item.shortcutKey,
      description: `Select ${item.label}`,
      contextId: 'Global',
      action: () => setSelectedId(item.id),
      enabled: true,
    }));
    
    keyboardManager.functions.registerShortcuts(shortcuts);
    
    return () => {
      keyboardManager.functions.unregisterShortcuts(shortcuts.map(s => s.id));
    };
  }, [items]);
  
  const renderHint = (shortcutKey: string) => {
    const keyParts = shortcutKey.split('+');
    const isPressed = keyParts.some(part => pressedKeys.includes(part));
    
    if (!showHints) return null;
    
    return (
      <Box sx={{ position: 'absolute', ...keyboardHintContainerSx, top: 4, right: 4 }}>
        {keyParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <Box component="span" sx={keyboardHintSeparatorSx}>
                +
              </Box>
            )}
            <Chip
              label={part}
              size="small"
              sx={
                pressedKeys.includes(part)
                  ? keyboardHintKeyPressedSx
                  : keyboardHintKeySx
              }
            />
          </React.Fragment>
        ))}
      </Box>
    );
  };
  
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
      {items.map(item => (
        <Box
          key={item.id}
          onClick={() => setSelectedId(item.id)}
          sx={{
            p: 2,
            position: 'relative',
            border: '2px solid',
            borderColor: selectedId === item.id ? 'primary.main' : 'divider',
            cursor: 'pointer',
            borderRadius: 1,
            backgroundColor: selectedId === item.id ? '#f0f0f0' : 'white',
          }}
        >
          <div>{item.label}</div>
          {renderHint(item.shortcutKey)}
        </Box>
      ))}
    </Box>
  );
};

/**
 * Key points for manual hint rendering:
 * 
 * 1. Import styles from KeyboardShortcuts module
 * 2. Get showHints and pressedKeys from Redux
 * 3. Create helper function to render hints
 * 4. Render hints in separate overlay/container
 * 5. Position hints manually (absolute positioning typical)
 * 6. Still register shortcuts normally with registerShortcuts()
 * 7. Keys highlight when pressed via pressedKeys state
 * 
 * Advantages over ShortcutHint wrapper:
 * - Works with any component (no wrapping needed)
 * - Full control over positioning
 * - Can customize appearance
 * - Preserves component layout/functionality
 * 
 * Disadvantages:
 * - More code to write
 * - Must manage positioning yourself
 * - Need to handle visibility state (showHints)
 */

export default TabsWithManualHints;
