/**
 * Redux selectors for KeyboardShortcuts module
 */

import { createSelector } from '@reduxjs/toolkit';
import { KeyboardShortcutsState } from './state';
import { Shortcut } from '@kernel/modules/base';

/**
 * Select the entire KeyboardShortcuts state slice
 */
export const selectKeyboardShortcutsState = (state: any): KeyboardShortcutsState => 
  state.KeyboardShortcuts;

/**
 * Select all registered shortcuts
 */
export const selectAllShortcuts = createSelector(
  [selectKeyboardShortcutsState],
  (state) => state.shortcuts
);

/**
 * Select a specific shortcut by ID
 */
export const selectShortcutById = (shortcutId: string) =>
  createSelector(
    [selectAllShortcuts],
    (shortcuts) => shortcuts[shortcutId]
  );

/**
 * Select the current context stack
 */
export const selectContextStack = createSelector(
  [selectKeyboardShortcutsState],
  (state) => state.contextStack
);

/**
 * Select the current (top) context
 */
export const selectCurrentContext = createSelector(
  [selectContextStack],
  (stack) => stack[stack.length - 1]
);

/**
 * Select whether the shortcuts system is enabled
 */
export const selectEnabled = createSelector(
  [selectKeyboardShortcutsState],
  (state) => state.enabled
);

/**
 * Select whether keyboard hints should be shown
 */
export const selectShowHints = createSelector(
  [selectKeyboardShortcutsState],
  (state) => state.showHints
);

/**
 * Select currently pressed keys (for visual feedback)
 */
export const selectPressedKeys = createSelector(
  [selectKeyboardShortcutsState],
  (state) => state.pressedKeys
);

/**
 * Select all shortcuts for a specific context
 */
export const selectShortcutsForContext = (contextId: string) =>
  createSelector(
    [selectAllShortcuts],
    (shortcuts) =>
      Object.values(shortcuts).filter(
        (shortcut) => shortcut.contextId === contextId
      )
  );

/**
 * Select all active shortcuts (for all contexts in the current stack)
 */
export const selectActiveShortcuts = createSelector(
  [selectAllShortcuts, selectContextStack],
  (shortcuts, contextStack) => {
    const activeShortcuts: Record<string, Shortcut> = {};
    
    // Include shortcuts from all contexts in the stack
    for (const shortcut of Object.values(shortcuts)) {
      if (contextStack.includes(shortcut.contextId) && shortcut.enabled !== false) {
        activeShortcuts[shortcut.id] = shortcut;
      }
    }
    
    return activeShortcuts;
  }
);

/**
 * Find a shortcut by key combination in the active contexts
 */
export const selectShortcutByKey = (key: string) =>
  createSelector(
    [selectActiveShortcuts, selectContextStack],
    (activeShortcuts, contextStack) => {
      // Search from top of stack downward (most specific context first)
      for (let i = contextStack.length - 1; i >= 0; i--) {
        const contextId = contextStack[i];
        const shortcut = Object.values(activeShortcuts).find(
          (s) => s.key === key && s.contextId === contextId
        );
        if (shortcut) return shortcut;
      }
      return undefined;
    }
  );
