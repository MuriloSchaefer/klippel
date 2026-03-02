import { Manager, Shortcut } from "@kernel/modules/base";


export interface KeyboardShortcutsManager extends Manager {
    functions: {
        registerShortcuts: (shortcuts: Shortcut[], options?: {context: string}) => void;
        unregisterShortcuts: (shortcutIds: string[], options?: {context: string}) => void;
    }
}


export default function useKeyboardShortcutsManager(): KeyboardShortcutsManager{

    return {
        functions: {
            registerShortcuts: (shortcuts: Shortcut[], options?: {context: string}) => {

            },
            unregisterShortcuts: (shortcutIds: string[], options?: {context: string}) => {

            }
        }
    }
}