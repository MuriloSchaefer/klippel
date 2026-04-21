/**
 * ShortcutHint - Wraps a component and shows its keyboard shortcut as a persistent badge
 * 
 * Usage:
 * <ShortcutHint shortcutId="layout.ribbon.toggle">
 *   <Button>Toggle Ribbon</Button>
 * </ShortcutHint>
 */

import React, { ReactElement, useMemo } from 'react';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import KeyboardIcon from '@mui/icons-material/Keyboard';

import useModule from '@kernel/hooks/useModule';
import { Store } from '@kernel/modules/Store';
import { selectShowHints, selectShortcutById, selectPressedKeys } from '../store/selectors';
import {
  keyboardHintContainerSx,
  keyboardHintKeySx,
  keyboardHintKeyPressedSx,
  keyboardHintSeparatorSx,
  keyboardHintWrapperSx,
  getBadgePosition,
  type BadgePlacement,
} from '../utils/keyboardHintStyles';

export interface ShortcutHintProps {
  /**
   * The ID of the shortcut to display
   */
  shortcutId: string;
  
  /**
   * The child element to wrap (must accept ref and event handlers)
   */
  children: ReactElement;
  
  /**
   * Whether to show the hint even when global hints are disabled
   */
  alwaysShow?: boolean;
  
  /**
   * Placement of the badge
   */
  placement?: BadgePlacement;
}

const ShortcutHint: React.FC<ShortcutHintProps> = React.memo(({
  shortcutId,
  children,
  alwaysShow = false,
  placement = 'bottom-right',
}) => {
  const storeModule = useModule<Store>('Store');
  const { useAppSelector } = storeModule.hooks;
  
  const showHints = useAppSelector(selectShowHints);
  const shortcut = useAppSelector(selectShortcutById(shortcutId));
  const pressedKeys = useAppSelector(selectPressedKeys);
  
  // Calculate badge position based on placement
  const badgePosition = useMemo(() => getBadgePosition(placement), [placement]);
  
  // Split key by '+' and render each part as a Chip
  const keyParts = useMemo(() => shortcut?.key.split('+') || [], [shortcut?.key]);
  
  // Check if any of the keys in this shortcut are currently pressed
  const isPressed = useMemo(() => {
    return keyParts.some(part => pressedKeys.includes(part));
  }, [keyParts, pressedKeys]);
  
  // Don't show hint if:
  // - Global hints are disabled and alwaysShow is false
  // - Shortcut doesn't exist
  // - Shortcut is disabled
  if ((!showHints && !alwaysShow) || !shortcut || shortcut.enabled === false) {
    return children;
  }
  
  return (
    <Box sx={keyboardHintWrapperSx}>
      {children}
      <Box
        sx={{
          ...keyboardHintContainerSx,
          ...badgePosition,
        }}
      >
        <KeyboardIcon
          sx={{
            fontSize: '10px',
            color: isPressed ? 'secondary.main' : 'rgba(255, 255, 255, 0.4)',
            transition: 'color 0.1s ease-in-out',
          }}
        />
        {keyParts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <Box
                component="span"
                sx={keyboardHintSeparatorSx}
              >
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
    </Box>
  );
});

ShortcutHint.displayName = 'ShortcutHint';

export default ShortcutHint;
