import {
  IModule,
  PostBootInitializationProps,
  StartModuleProps,
} from "@kernel/modules/base";
import keyboardShortcutsSlice from "../store/slice";
import keyboardShortcutsMiddleware from "../store/middleware";
import { MODULE_NAME } from "../constants";
import KeyboardShortcutsTrayIcon from "../components/KeyboardShortcutsTrayIcon";

// Import the SystemTray registry name from Layout module
const SYSTEM_TRAY_REGISTRY_NAME = "systemTray";

/**
 * Initializes the KeyboardShortcuts module.
 *
 * This function:
 * 1. Registers the Redux slice (with restored session state)
 * 2. Registers the SystemTray icon
 * 3. Registers middleware for shortcut matching and session persistence
 */
export const startModule = ({
  managers: { storeManager, componentRegistryManager },
}: StartModuleProps) => {
  console.log("[KeyboardShortcuts] Module starting...");

  // Register Redux reducer (session state is already restored in the slice)
  storeManager.functions.loadReducer(
    MODULE_NAME,
    keyboardShortcutsSlice.reducer,
  );
  console.log("[KeyboardShortcuts] Redux store registered");

  // Register middleware for shortcut matching and action dispatch
  storeManager.functions.registerMiddleware(keyboardShortcutsMiddleware);
  console.log("[KeyboardShortcuts] Middleware registered");
};

export const postBootInitialization = ({
  managers: { componentRegistryManager },
}: PostBootInitializationProps) => {

  // Register SystemTray icon
  componentRegistryManager.functions.registerComponents({
    [SYSTEM_TRAY_REGISTRY_NAME]: {
      KeyboardShortcutsTrayIcon: KeyboardShortcutsTrayIcon,
    },
  });

  console.log("[KeyboardShortcuts] Module started");
};
