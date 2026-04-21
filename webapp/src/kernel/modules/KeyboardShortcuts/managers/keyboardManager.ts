import { Manager, Shortcut } from "@kernel/modules/base";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { registerShortcut as registerShortcutAction, unregisterShortcut as unregisterShortcutAction } from "../store/actions";

export interface KeyboardShortcutsManager extends Manager {
    functions: {
        registerShortcuts: (shortcuts: Shortcut[], options?: {context: string}) => void;
        unregisterShortcuts: (shortcutIds: string[], options?: {context: string}) => void;
    }
}

export default function useKeyboardShortcutsManager(): KeyboardShortcutsManager{
    const storeModule = useModule<Store>("Store");
    const { useAppDispatch } = storeModule.hooks;
    const dispatch = useAppDispatch();

    return {
        functions: {
            /**
             * Register one or more keyboard shortcuts
             * 
             * @param shortcuts - Array of shortcut definitions
             * @param options - Optional co5ntext information (not used in current implementation)
             */
            registerShortcuts: (shortcuts: Shortcut[], options?: {context: string}) => {
                shortcuts.forEach(shortcut => {
                    // Validate shortcut before registering
                    if (!shortcut.id) {
                        console.error('[KeyboardShortcuts] Cannot register shortcut without id:', shortcut);
                        return;
                    }
                    
                    if (!shortcut.key) {
                        console.error('[KeyboardShortcuts] Cannot register shortcut without key:', shortcut);
                        return;
                    }
                    
                    if (!shortcut.contextId) {
                        console.warn('[KeyboardShortcuts] Shortcut registered without contextId, defaulting to "Global":', shortcut);
                        shortcut.contextId = 'Global';
                    }
                    
                    // Dispatch Redux action to register the shortcut
                    dispatch(registerShortcutAction(shortcut));
                    
                    // Log registration for debugging
                    if (process.env.NODE_ENV === 'development') {
                        console.log(
                            `[KeyboardShortcuts] Registered: ${shortcut.id} (${shortcut.key}) in context "${shortcut.contextId}"`
                        );
                    }
                });
            },
            
            /**
             * Unregister one or more keyboard shortcuts by ID
             * 
             * @param shortcutIds - Array of shortcut IDs to unregister
             * @param options - Optional context information (not used in current implementation)
             */
            unregisterShortcuts: (shortcutIds: string[], options?: {context: string}) => {
                shortcutIds.forEach(shortcutId => {
                    dispatch(unregisterShortcutAction(shortcutId));
                    
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[KeyboardShortcuts] Unregistered: ${shortcutId}`);
                    }
                });
            }
        }
    }
}