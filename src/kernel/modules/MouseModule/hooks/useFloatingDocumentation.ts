import { useAppDispatch } from "@kernel/store/hooks";
import { IDocumentationManager } from "../interfaces";
import {
  floatingDocumentationCollapsed,
  floatingDocumentationExpanded,
} from "../store/actions";

/**
 * Retrieves the viewport manager.
 * @returns {ShortcutData} The shortcut state and hooks.
 */
export const useFloatingDocumentation = (): IDocumentationManager => {
  const dispatch = useAppDispatch();

  return {
    hooks: {
      // documentation hooks
      showFloatingDocumentation(e: MouseEvent, content: string) {
        dispatch(
          floatingDocumentationExpanded({ x: e.pageX, y: e.pageY, content })
        );
      },
      closeFloatingDocumentation() {
        dispatch(floatingDocumentationCollapsed());
      },
    },
  };
};

export default useFloatingDocumentation;
