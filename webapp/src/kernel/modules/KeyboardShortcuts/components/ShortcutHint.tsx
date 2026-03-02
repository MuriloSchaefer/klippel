/**
 * ShortcutHint - Wraps a component and shows its keyboard shortcut as a persistent badge
 * 
 * Usage:
 * <ShortcutHint shortcutId="layout.ribbon.toggle">
 *   <Button>Toggle Ribbon</Button>
 * </ShortcutHint>
 */

import React, { ReactElement } from 'react';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

import useModule from '@kernel/hooks/useModule';
import { Store } from '@kernel/modules/Store';
import { selectShowHints, selectShortcutById } from '../store/selectors';

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
  placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const ShortcutHint: React.FC<ShortcutHintProps> = ({
  shortcutId,
  children,
  alwaysShow = false,
  placement = 'bottom-right',
}) => {
  const storeModule = useModule<Store>('Store');
  const { useAppSelector } = storeModule.hooks;
  
  const showHints = useAppSelector(selectShowHints);
  const shortcut = useAppSelector(selectShortcutById(shortcutId));
  
  // Don't show hint if:
  // - Global hints are disabled and alwaysShow is false
  // - Shortcut doesn't exist
  // - Shortcut is disabled
  if ((!showHints && !alwaysShow) || !shortcut || shortcut.enabled === false) {
    return children;
  }
  
  // Calculate badge position based on placement
  const badgePosition = {
    'top-left': { top: 4, left: 4 },
    'top-right': { top: 4, right: 4 },
    'bottom-left': { bottom: 4, left: 4 },
    'bottom-right': { bottom: 4, right: 4 },
  }[placement];
  
  // Split key by '+' and render each part as a Chip
  const keyParts = shortcut.key.split('+');
  
  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <Box
        sx={{
          position: 'absolute',
          ...badgePosition,
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          bgcolor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          borderRadius: 1,
          px: 0.5,
          py: 0.25,
          pointerEvents: 'none',
          zIndex: 1,
          boxShadow: 1,
        }}
      >
        {keyParts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <Box
                component="span"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '10px',
                  mx: 0.25,
                }}
              >
                +
              </Box>
            )}
            <Chip
              label={part}
              size="small"
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                height: '18px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'monospace',
                '& .MuiChip-label': {
                  px: 0.75,
                  py: 0,
                },
              }}
            />
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

export default ShortcutHint;
