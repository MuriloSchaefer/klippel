import { StartModuleProps } from "@kernel/modules/base";
import keyboardShortcutsSlice from "../store/slice";
import keyboardShortcutsMiddleware from "../store/middleware";
import { MODULE_NAME } from "../constants";
import KeyboardShortcutsTrayIcon from "../components/KeyboardShortcutsTrayIcon";
import { registerShortcut } from "../store/actions";

// Import the SystemTray registry name from Layout module
const SYSTEM_TRAY_REGISTRY_NAME = 'systemTray';

/**
 * Initializes the KeyboardShortcuts module.
 * 
 * This function:
 * 1. Registers the Redux slice
 * 2. Registers the SystemTray icon
 * 3. Registers middleware for shortcut matching
 * 4. Iterates through loaded modules and registers their shortcuts
 */
export const startModule = ({
  dispatch,
  managers: { storeManager, componentRegistryManager },
  storage,
}: StartModuleProps) => {
  console.log('[KeyboardShortcuts] Module starting...');
  
  // Register Redux reducer
  storeManager.functions.loadReducer(MODULE_NAME, keyboardShortcutsSlice.reducer);
  console.log('[KeyboardShortcuts] Redux store registered');
  
  // Register middleware for shortcut matching and action dispatch
  storeManager.functions.registerMiddleware(keyboardShortcutsMiddleware);
  console.log('[KeyboardShortcuts] Middleware registered');
  
  // Register SystemTray icon
  componentRegistryManager.functions.registerComponents({
    [SYSTEM_TRAY_REGISTRY_NAME]: {
      'KeyboardShortcutsTrayIcon': KeyboardShortcutsTrayIcon
    }
  });
  console.log('[KeyboardShortcuts] SystemTray icon registered');
  
  // TODO: Iterate loaded modules and register their shortcuts
  // This requires access to the Loader module to query loaded modules
  // For now, modules will register their shortcuts in their own startModule
  
  console.log('[KeyboardShortcuts] Module started');
};
