/**
 * Reusable style utilities for keyboard hint badges
 */

import { SxProps, Theme } from '@mui/material/styles';

/**
 * Base style for keyboard hint badge container
 */
export const keyboardHintContainerSx: SxProps<Theme> = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  gap: 0.2,
  bgcolor: 'rgba(0, 0, 0, 0.6)',
  backdropFilter: 'blur(4px)',
  borderRadius: 0.5,
  px: 0.3,
  py: 0.15,
  pointerEvents: 'none',
  zIndex: 1,
  boxShadow: 1,
};

/**
 * Style for keyboard hint key chip (normal state - grayed out)
 */
export const keyboardHintKeySx: SxProps<Theme> = {
  bgcolor: 'rgba(128, 128, 128, 0.5)',
  color: 'rgba(255, 255, 255, 0.6)',
  height: '14px',
  fontSize: '8px',
  fontWeight: 600,
  fontFamily: 'monospace',
  transition: 'all 0.1s ease-in-out',
  '& .MuiChip-label': {
    px: 0.5,
    py: 0,
  },
};

/**
 * Style for keyboard hint key chip when pressed (active state - contrasting color)
 */
export const keyboardHintKeyPressedSx: SxProps<Theme> = {
  bgcolor: 'secondary.main',
  color: 'secondary.contrastText',
  height: '14px',
  fontSize: '8px',
  fontWeight: 700,
  fontFamily: 'monospace',
  boxShadow: 2,
  transform: 'scale(1.15)',
  transition: 'all 0.1s ease-in-out',
  '& .MuiChip-label': {
    px: 0.5,
    py: 0,
  },
};

/**
 * Style for the separator between keys
 */
export const keyboardHintSeparatorSx: SxProps<Theme> = {
  color: 'rgba(255, 255, 255, 0.4)',
  fontSize: '7px',
  mx: 0.15,
};

/**
 * Get badge position styles based on placement
 */
export const getBadgePosition = (
  placement: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
): Record<string, any> => {
  const positions = {
    'top-left': { top: 24, left: 24 },
    'top-right': { top: 24, right: 24 },
    'bottom-left': { bottom: 24, left: 24 },
    'bottom-right': { bottom: 24, right: 24 },
    'center-bottom': { bottom: 24, right: '50%' },
  };
  return positions[placement];
};

/**
 * Class name for keyboard hint wrapper
 * Use this to add keyboard hint styling to any component
 */
export const KEYBOARD_HINT_WRAPPER_CLASS = 'keyboard-hint-wrapper';

/**
 * Style for wrapping elements that will have keyboard hints
 */
export const keyboardHintWrapperSx: SxProps<Theme> = {
  position: 'relative',
  display: 'inline-block',
};
