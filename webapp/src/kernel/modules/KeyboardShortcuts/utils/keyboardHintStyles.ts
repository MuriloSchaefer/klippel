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
  gap: 0.5,
  bgcolor: 'rgba(0, 0, 0, 0.82)',
  backdropFilter: 'blur(6px)',
  borderRadius: 1,
  border: '1px solid rgba(255, 255, 255, 0.12)',
  px: 0.75,
  py: 0.4,
  pointerEvents: 'none',
  zIndex: 1,
  boxShadow: 3,
};

/**
 * Style for keyboard hint key chip (normal state - grayed out)
 */
export const keyboardHintKeySx: SxProps<Theme> = {
  bgcolor: 'rgba(255, 255, 255, 0.12)',
  color: 'rgba(255, 255, 255, 0.85)',
  height: '20px',
  fontSize: '11px',
  fontWeight: 600,
  fontFamily: 'monospace',
  letterSpacing: '0.02em',
  transition: 'all 0.1s ease-in-out',
  '& .MuiChip-label': {
    px: 0.75,
    py: 0,
  },
};

/**
 * Style for keyboard hint key chip when pressed (active state - contrasting color)
 */
export const keyboardHintKeyPressedSx: SxProps<Theme> = {
  bgcolor: 'secondary.main',
  color: 'secondary.contrastText',
  height: '20px',
  fontSize: '11px',
  fontWeight: 700,
  fontFamily: 'monospace',
  letterSpacing: '0.02em',
  boxShadow: 2,
  transform: 'scale(1.1)',
  transition: 'all 0.1s ease-in-out',
  '& .MuiChip-label': {
    px: 0.75,
    py: 0,
  },
};

/**
 * Style for the separator between keys
 */
export const keyboardHintSeparatorSx: SxProps<Theme> = {
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: '10px',
  mx: 0.1,
};

export type BadgePlacement =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * Get badge position styles based on placement
 */
export const getBadgePosition = (placement: BadgePlacement): SxProps<Theme> => {
  const positions: Record<BadgePlacement, SxProps<Theme>> = {
    'top-left':      { top: 4, left: 4 },
    'top-center':    { top: 4, left: '50%', transform: 'translateX(-50%)' },
    'top-right':     { top: 4, right: 4 },
    'bottom-left':   { bottom: 4, left: 4 },
    'bottom-center': { bottom: 4, left: '50%', transform: 'translateX(-50%)' },
    'bottom-right':  { bottom: 4, right: 4 },
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
};
