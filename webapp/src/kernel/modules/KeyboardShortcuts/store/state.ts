/**
 * Redux state shape for KeyboardShortcuts module
 */

import { Shortcut } from '@kernel/modules/base';

export interface KeyboardShortcutsState {
  /**
   * Map of all registered shortcuts, keyed by shortcut ID
   */
  shortcuts: Record<string, Shortcut>;
  
  /**
   * Stack of active contexts (LIFO: Last In, First Out)
   * Always starts with 'Global' at the base
   */
  contextStack: string[];
  
  /**
   * Global enabled/disabled flag for shortcuts system
   */
  enabled: boolean;
  
  /**
   * Whether to show keyboard hint tooltips on UI elements
   */
  showHints: boolean;
  
  /**
   * Set of currently pressed modifier/keys for visual feedback
   * e.g., ['Alt', '1'] when user is pressing Alt+1
   */
  pressedKeys: string[];
}

export const initialState: KeyboardShortcutsState = {
  shortcuts: {},
  contextStack: ['Global'],
  enabled: true,
  showHints: false,
  pressedKeys: [],
};
