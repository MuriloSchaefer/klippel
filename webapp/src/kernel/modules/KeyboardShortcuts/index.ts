import { IModule } from '@kernel/modules/base';
import { MODULE_NAME, MODULE_VERSION } from './constants';
import { startModule, postBootInitialization } from './kernelCalls';
import KeyboardListener from './components/KeyboardListener';
import ShortcutProvider from './components/ShortcutProvider';
import FocusShortcutProvider from './components/FocusShortcutProvider';
import KeyboardShortcutsTrayIcon from './components/KeyboardShortcutsTrayIcon';
import ShortcutHint from './components/ShortcutHint';
import useKeyboardShortcutsManager from './managers/keyboardManager';
import {
  keyboardHintContainerSx,
  keyboardHintKeySx,
  keyboardHintKeyPressedSx,
  keyboardHintSeparatorSx,
  keyboardHintWrapperSx,
  getBadgePosition,
  KEYBOARD_HINT_WRAPPER_CLASS,
} from './utils/keyboardHintStyles';

export interface IKeyboardShortcutsModule extends IModule {
  name: typeof MODULE_NAME;
  version: typeof MODULE_VERSION;
  components: {
    KeyboardListener: typeof KeyboardListener;
    ShortcutProvider: typeof ShortcutProvider;
    FocusShortcutProvider: typeof FocusShortcutProvider;
    KeyboardShortcutsTrayIcon: typeof KeyboardShortcutsTrayIcon;
    ShortcutHint: typeof ShortcutHint;
  };
  managers: {
    useKeyboardShortcutsManager: typeof useKeyboardShortcutsManager;
  };
  styles: {
    keyboardHintContainerSx: typeof keyboardHintContainerSx;
    keyboardHintKeySx: typeof keyboardHintKeySx;
    keyboardHintKeyPressedSx: typeof keyboardHintKeyPressedSx;
    keyboardHintSeparatorSx: typeof keyboardHintSeparatorSx;
    keyboardHintWrapperSx: typeof keyboardHintWrapperSx;
    getBadgePosition: typeof getBadgePosition;
    KEYBOARD_HINT_WRAPPER_CLASS: typeof KEYBOARD_HINT_WRAPPER_CLASS;
  };
}

// Export for type usage
export type KeyboardShortcuts = IKeyboardShortcutsModule;

/**
 * KeyboardShortcuts module manages keyboard shortcuts across the application.
 * 
 * Features:
 * - Global keyboard event capture via KeyboardListener
 * - Context-based shortcut scoping via ShortcutProvider
 * - Utility functions for key event normalization
 * - Redux state management for shortcuts
 * - Visual hints for keyboard shortcuts (ShortcutHint component)
 * - SystemTray icon for toggling hint visibility
 * - Reusable style classes for keyboard hint badges
 * 
 * Usage:
 * 1. Mount KeyboardListener in App.tsx (already done)
 * 2. Use ShortcutProvider to create context scopes
 * 3. Wrap UI elements with ShortcutHint to show keyboard shortcuts
 * 4. Toggle hints visibility via SystemTray icon
 * 5. Use styles.keyboardHintWrapperSx to add hint styling to any component
 */
const module: IKeyboardShortcutsModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: [],
  components: {
    KeyboardListener,
    ShortcutProvider,
    FocusShortcutProvider,
    KeyboardShortcutsTrayIcon,
    ShortcutHint,
  },
  hooks: {},
  kernelCalls: {
    startModule,
    restartModule() {
      console.log('[KeyboardShortcuts] Restart not implemented');
    },
    shutdownModule() {
      console.log('[KeyboardShortcuts] Shutdown not implemented');
    },
    postBootInitialization
  },
  managers: {
    useKeyboardShortcutsManager,
  },
  styles: {
    keyboardHintContainerSx,
    keyboardHintKeySx,
    keyboardHintKeyPressedSx,
    keyboardHintSeparatorSx,
    keyboardHintWrapperSx,
    getBadgePosition,
    KEYBOARD_HINT_WRAPPER_CLASS,
  }
};

export default module;
