/**
 * ShortcutHint - Wraps a component and shows its keyboard shortcut as a persistent badge
 * 
 * Usage:
 * <ShortcutHint shortcutId="layout.ribbon.toggle">
 *   <Button>Toggle Ribbon</Button>
 * </ShortcutHint>
 */

import React, { ReactElement, useMemo } from 'react';
import { shallowEqual } from 'react-redux';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import type { SxProps, Theme } from '@mui/material/styles';

import useModule from '@kernel/hooks/useModule';
import { Store } from '@kernel/modules/Store';
import type { Shortcut } from '@kernel/modules/base';
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

/**
 * Inner badge — only mounted when the hint is actually visible.
 * Subscribes to a per-shortcut pressed-state vector with shallowEqual so it
 * only re-renders when one of *its own* key parts changes pressed state.
 */
interface ShortcutHintBadgeProps {
  shortcut: Shortcut;
  children: ReactElement;
  placement: BadgePlacement;
}

const ShortcutHintBadge: React.FC<ShortcutHintBadgeProps> = ({
  shortcut,
  children,
  placement,
}) => {
  const storeModule = useModule<Store>('Store');
  const { useAppSelector } = storeModule.hooks;

  const keyParts = useMemo(() => shortcut.key.split('+'), [shortcut.key]);

  // Returns a boolean[] aligned with keyParts. shallowEqual prevents re-render
  // when other keys (not part of this shortcut) toggle pressed state.
  const pressedState = useAppSelector(
    (state) => {
      const pressed = selectPressedKeys(state);
      return keyParts.map((part) => pressed.includes(part));
    },
    shallowEqual,
  );

  const badgePosition = useMemo(() => getBadgePosition(placement), [placement]);
  const isPressed = pressedState.some(Boolean);

  return (
    <Box sx={keyboardHintWrapperSx}>
      {children}
      <Box sx={[keyboardHintContainerSx, badgePosition] as SxProps<Theme>}>
        <KeyboardIcon
          sx={{
            fontSize: '14px',
            color: isPressed ? 'secondary.main' : 'rgba(255, 255, 255, 0.5)',
            transition: 'color 0.1s ease-in-out',
          }}
        />
        {keyParts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <Box component="span" sx={keyboardHintSeparatorSx}>
                +
              </Box>
            )}
            <Chip
              label={part}
              size="small"
              sx={pressedState[index] ? keyboardHintKeyPressedSx : keyboardHintKeySx}
            />
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

/**
 * Outer gate — subscribes only to `showHints` and the shortcut record.
 * When the hint is hidden, it does NOT subscribe to pressedKeys, so key
 * presses do not trigger any re-render here.
 */
const ShortcutHint: React.FC<ShortcutHintProps> = React.memo(({
  shortcutId,
  children,
  alwaysShow = false,
  placement = 'bottom-right',
}) => {
  const storeModule = useModule<Store>('Store');
  const { useAppSelector } = storeModule.hooks;

  const showHints = useAppSelector(selectShowHints);
  const shortcutSelector = useMemo(() => selectShortcutById(shortcutId), [shortcutId]);
  const shortcut = useAppSelector(shortcutSelector);

  const visible =
    (showHints || alwaysShow) && !!shortcut && shortcut.enabled !== false;

  if (!visible) {
    return children;
  }

  return (
    <ShortcutHintBadge shortcut={shortcut} placement={placement}>
      {children}
    </ShortcutHintBadge>
  );
});

ShortcutHint.displayName = 'ShortcutHint';

export default ShortcutHint;
