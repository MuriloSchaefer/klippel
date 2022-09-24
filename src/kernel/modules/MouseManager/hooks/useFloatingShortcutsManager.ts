import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import { FloatingShortcutsHashMap } from "../store/state";
import {
  floatingShortcutsCreated,
  floatingShortcutsDeleted,
} from "../store/actions";
import { IShortcutsManager } from "../interfaces";

/**
 * Retrieves the floating shortcuts manager.
 * @returns {ShortcutData} The shortcut manager state and hooks.
 */
export const useFloatingShortcutsManager = (): IShortcutsManager => {
  const dispatch = useAppDispatch();

  const managerState = useAppSelector<FloatingShortcutsHashMap | undefined>(
    (state) => state.MouseManager.shortcuts
  );

  return {
    state: managerState,
    hooks: {
      createShortcuts(id: string) {
        dispatch(floatingShortcutsCreated({ id }));
      },
      deleteShortcuts(id: string) {
        dispatch(floatingShortcutsDeleted({ id }));
      },
    },
  };
};

export default useFloatingShortcutsManager;
