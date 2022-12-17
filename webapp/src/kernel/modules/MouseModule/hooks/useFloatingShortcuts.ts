import { useAppDispatch, useAppSelector } from "@kernel/store (deprecated)/hooks";
import { FloatingShortcuts, MouseModuleState } from "../store/state";
import {
  floatingShortcutsClosed,
  floatingShortcutsOpened,
} from "../store/actions";
import { createSelector } from "reselect";

export interface ShortcutsData <R> {
  state: R;
  hooks: {
    showShortcuts<S = unknown>(e: MouseEvent, extra_state?: S): void;
    closeShortcuts(): void;
  }; // hooks to manipulate the shortcut element
}

/**
 * Retrieves the viewport manager.
 * @returns {ShortcutsData} The shortcut state and hooks.
 */
export const useFloatingShortcuts = (id: string): ShortcutsData<FloatingShortcuts | undefined>  => {
  const dispatch = useAppDispatch();

  const shortcuts = useAppSelector<FloatingShortcuts | undefined>((state: {MouseModule: MouseModuleState}) => state.MouseModule.shortcuts[id]);

  return {
    state: shortcuts,
    hooks: {
      showShortcuts<S = unknown>(e: MouseEvent, extra_state?: S) {
        dispatch(floatingShortcutsOpened({ id, x: e.pageX, y: e.pageY, extra_state }));
      },
      closeShortcuts() {
        dispatch(floatingShortcutsClosed({ id }));
      },
    },
  };
};

export default useFloatingShortcuts;
