/**
 * Redux actions for KeyboardShortcuts module
 * Following the pattern: [ModuleName:Command/Event] ActionName
 */

import { createAction } from '@reduxjs/toolkit';
import { Shortcut } from '@kernel/modules/base';

// ============================================================================
// COMMAND ACTIONS (imperative operations)
// ============================================================================

/**
 * Register a new keyboard shortcut
 */
export const registerShortcut = createAction(
  '[KeyboardShortcuts:Command] RegisterShortcut',
  (shortcut: Shortcut) => ({ payload: shortcut })
);

/**
 * Unregister a keyboard shortcut by ID
 */
export const unregisterShortcut = createAction(
  '[KeyboardShortcuts:Command] UnregisterShortcut',
  (shortcutId: string) => ({ payload: { shortcutId } })
);

/**
 * Push a new context onto the context stack
 */
export const pushContext = createAction(
  '[KeyboardShortcuts:Command] PushContext',
  (contextId: string) => ({ payload: { contextId } })
);

/**
 * Pop the top context from the context stack
 */
export const popContext = createAction(
  '[KeyboardShortcuts:Command] PopContext'
);

/**
 * Enable or disable the entire shortcuts system
 */
export const setEnabled = createAction(
  '[KeyboardShortcuts:Command] SetEnabled',
  (enabled: boolean) => ({ payload: { enabled } })
);

/**
 * Toggle visibility of keyboard hint tooltips
 */
export const toggleShowHints = createAction(
  '[KeyboardShortcuts:Command] ToggleShowHints'
);

/**
 * Set visibility of keyboard hint tooltips
 */
export const setShowHints = createAction(
  '[KeyboardShortcuts:Command] SetShowHints',
  (showHints: boolean) => ({ payload: { showHints } })
);

/**
 * Add a key to the pressed keys set (for visual feedback)
 */
export const addPressedKey = createAction(
  '[KeyboardShortcuts:Command] AddPressedKey',
  (key: string) => ({ payload: { key } })
);

/**
 * Remove a key from the pressed keys set
 */
export const removePressedKey = createAction(
  '[KeyboardShortcuts:Command] RemovePressedKey',
  (key: string) => ({ payload: { key } })
);

/**
 * Clear all pressed keys
 */
export const clearPressedKeys = createAction(
  '[KeyboardShortcuts:Command] ClearPressedKeys'
);

// ============================================================================
// EVENT ACTIONS (things that happened)
// ============================================================================

/**
 * A key was pressed (dispatched by KeyboardListener)
 * Includes keyParts for efficient visual feedback updates
 */
export const keyPressed = createAction(
  '[KeyboardShortcuts:Event] KeyPressed',
  (key: string, keyParts: string[], originalEvent: {
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    key: string;
    code: string;
  }, phase: 'down' | 'up' = 'down') => ({
    payload: { key, keyParts, originalEvent, phase }
  })
);

/**
 * A shortcut was successfully registered
 */
export const shortcutRegistered = createAction(
  '[KeyboardShortcuts:Event] ShortcutRegistered',
  (shortcut: Shortcut) => ({ payload: shortcut })
);

/**
 * A shortcut was unregistered
 */
export const shortcutUnregistered = createAction(
  '[KeyboardShortcuts:Event] ShortcutUnregistered',
  (shortcutId: string) => ({ payload: { shortcutId } })
);

/**
 * A shortcut conflict was detected
 */
export const conflictDetected = createAction(
  '[KeyboardShortcuts:Event] ConflictDetected',
  (existingShortcut: Shortcut, newShortcut: Shortcut) => ({
    payload: { existingShortcut, newShortcut }
  })
);
