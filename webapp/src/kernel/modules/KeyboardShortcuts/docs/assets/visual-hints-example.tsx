/**
 * Example: Adding visual keyboard hints to components
 * 
 * This example shows how to display keyboard hint badges on any component
 * using the exported styles from KeyboardShortcuts module.
 */

import React, { useRef } from "react";
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import useModule from "@kernel/hooks/useModule";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";
import { selectShowHints, selectPressedKeys } from "@kernel/modules/KeyboardShortcuts/store/selectors";
import { Store } from "@kernel/modules/Store";

const VisualHintsExample = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  
  const keyboardShortcutsModule = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  
  // Import reusable styles
  const { 
    keyboardHintContainerSx,
    keyboardHintKeySx,
    keyboardHintKeyPressedSx,
    keyboardHintSeparatorSx,
  } = keyboardShortcutsModule.styles;

  const showHints = useAppSelector(selectShowHints);
  const pressedKeys = useAppSelector(selectPressedKeys);
  
  const elementRef = useRef<HTMLElement | null>(null);

  // Example: Render hint for Ctrl+S
  const renderShortcutHint = (shortcutKey: string) => {
    const keyParts = shortcutKey.split('+');
    const isPressed = keyParts.some(part => pressedKeys.includes(part));
    
    if (!showHints || !elementRef.current) return null;
    
    return (
      <Box
        sx={{
          position: 'absolute',
          ...keyboardHintContainerSx,
          pointerEvents: 'none',
          zIndex: 10,
        }}
        style={{
          // Position relative to parent element
          right: '4px',
          bottom: '4px',
        }}
      >
        {/* Keyboard icon - changes color when keys are pressed */}
        <KeyboardIcon
          sx={{
            fontSize: '10px',
            color: isPressed ? 'secondary.main' : 'rgba(255, 255, 255, 0.4)',
            transition: 'color 0.1s ease-in-out',
          }}
        />
        
        {/* Render each key part */}
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
                  ? keyboardHintKeyPressedSx  // Highlighted when pressed
                  : keyboardHintKeySx         // Grayed out when not pressed
              }
            />
          </React.Fragment>
        ))}
      </Box>
    );
  };

  return (
    <Box 
      ref={elementRef}
      sx={{ position: 'relative' }}
    >
      {/* Your component content */}
      <button>Save File</button>
      
      {/* Render the hint overlay */}
      {renderShortcutHint('Ctrl+s')}
    </Box>
  );
};

export default VisualHintsExample;
