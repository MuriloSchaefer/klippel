import { IModule } from '@kernel/modules/base';
import { MODULE_NAME, MODULE_VERSION } from './constants';
import { startModule } from './kernelCalls';
import KeyboardListener from './components/KeyboardListener';
import ShortcutProvider from './components/ShortcutProvider';
import KeyboardShortcutsTrayIcon from './components/KeyboardShortcutsTrayIcon';
import ShortcutHint from './components/ShortcutHint';
import useKeyboardShortcutsManager from './managers/keyboardManager';

export interface IKeyboardShortcutsModule extends IModule {
  name: typeof MODULE_NAME;
  version: typeof MODULE_VERSION;
  components: {
    KeyboardListener: typeof KeyboardListener;
    ShortcutProvider: typeof ShortcutProvider;
    KeyboardShortcutsTrayIcon: typeof KeyboardShortcutsTrayIcon;
    ShortcutHint: typeof ShortcutHint;
  };
  managers: {
    useKeyboardShortcutsManager: typeof useKeyboardShortcutsManager;
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
 * 
 * Usage:
 * 1. Mount KeyboardListener in App.tsx (already done)
 * 2. Use ShortcutProvider to create context scopes
 * 3. Wrap UI elements with ShortcutHint to show keyboard shortcuts
 * 4. Toggle hints visibility via SystemTray icon
 */
const module: IKeyboardShortcutsModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: [],
  components: {
    KeyboardListener,
    ShortcutProvider,
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
  },
  managers: {
    useKeyboardShortcutsManager,
  }
};

export default module;
