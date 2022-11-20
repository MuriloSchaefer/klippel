import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import { FloatingShortcuts } from "../store/state";
import {
  floatingShortcutsClosed,
  floatingShortcutsOpened,
} from "../store/actions";

export interface ShortcutsData {
  state: FloatingShortcuts | undefined;
  hooks: {
    showShortcuts(e: MouseEvent): void;
    closeShortcuts(): void;
  }; // hooks to manipulate the shortcut element
}

/**
 * Retrieves the viewport manager.
 * @returns {ShortcutData} The shortcut state and hooks.
 */
export const useFloatingShortcuts = (id: string): ShortcutsData => {
  const dispatch = useAppDispatch();

  const shortcuts = useAppSelector<FloatingShortcuts | undefined>(
    (state) => state.MouseModule.shortcuts[id]
  );

  return {
    state: shortcuts,
    hooks: {
      showShortcuts(e: MouseEvent) {
        dispatch(floatingShortcutsOpened({ id, x: e.pageX, y: e.pageY }));
      },
      closeShortcuts() {
        dispatch(floatingShortcutsClosed({ id }));
      },
    },
  };
};

export default useFloatingShortcuts;
