import { StartModuleProps } from "@kernel/modules/base";
import { MODULE_NAME, POINTER_CONTAINER_CONTEXT_ID } from "./constants";
import slice from "./store/slice";
import { initContainerHandlerMap } from "./pointerContainerRegistry";
import type { PointerState } from "./store/state";

export const startModule = ({
  managers: { storeManager, keyboardManager },
}: StartModuleProps) => {
  console.group('Starting pointer module')
  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);

  const handlerMap = initContainerHandlerMap();

  const getTopHandlers = () => {
    const state = storeManager.functions.getStore()?.getState() as { Pointer?: PointerState } | undefined;
    const stack = state?.Pointer?.containerFocusStack ?? [];
    const topId = stack[stack.length - 1];
    return topId ? handlerMap.get(topId) : undefined;
  };

  const isFocusedTextEntry = (): boolean => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable === true
    );
  };

  const isListboxOpen = (): boolean =>
    document.querySelector('ul[role="listbox"]') !== null;

  keyboardManager.functions.registerShortcuts([
    {
      id: 'pointer.container.confirmAndClose',
      key: 'Ctrl+Enter',
      contextId: POINTER_CONTAINER_CONTEXT_ID,
      description: 'Confirm and close container',
      action: () => {
        const handlers = getTopHandlers();
        if (!handlers) return;
        if (handlers.confirm) {
          if (handlers.confirm()) handlers.close();
        } else {
          handlers.close();
        }
      },
      enabled: true,
    },
    {
      id: 'pointer.container.close',
      key: 'Escape',
      contextId: POINTER_CONTAINER_CONTEXT_ID,
      description: 'Close container',
      action: () => {
        // Esc precedence inside a container:
        //   1. open listbox (Autocomplete/Select): MUI closes it, do nothing.
        //   2. focused input/textarea: blur it.
        //   3. otherwise: close the container.
        if (isListboxOpen()) return;
        if (isFocusedTextEntry()) {
          (document.activeElement as HTMLElement).blur();
          return;
        }
        getTopHandlers()?.close();
      },
      enabled: true,
    },
  ]);

  console.info('Pointer module started')
  console.groupEnd()
};
