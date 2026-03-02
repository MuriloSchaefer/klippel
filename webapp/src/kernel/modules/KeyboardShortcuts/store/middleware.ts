/**
 * KeyboardShortcuts Middleware - Matches keypresses to shortcuts and dispatches actions
 * 
 * This middleware:
 * 1. Listens for [KeyboardShortcuts:Event] KeyPressed actions
 * 2. Queries active shortcuts from state using selectShortcutByKey
 * 3. If a match is found, dispatches the shortcut's action
 * 4. Logs matching and dispatching for debugging
 */

import { createListenerMiddleware } from '@reduxjs/toolkit';
import { keyPressed, clearPressedKeys } from './actions';
import { selectShortcutByKey, selectEnabled } from './selectors';

const keyboardShortcutsMiddleware = createListenerMiddleware();

keyboardShortcutsMiddleware.startListening({
  actionCreator: keyPressed,
  effect: async (action, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const state = getState();
    
    const enabled = selectEnabled(state);

    // If shortcuts are disabled globally, don't process
    if (!enabled) {
      return;
    }

    const { key } = action.payload;

    // Try to find a matching shortcut
    const matchedShortcut = selectShortcutByKey(key)(state);

    if (matchedShortcut) {
      console.log(
        `[KeyboardShortcuts] Matched shortcut: ${matchedShortcut.id} (${key})`,
        matchedShortcut
      );

      // Dispatch the shortcut's action
      if (matchedShortcut.action) {
        console.log(
          `[KeyboardShortcuts] Dispatching action for shortcut: ${matchedShortcut.id}`,
          matchedShortcut.action
        );
        dispatch(matchedShortcut.action as any);
      } else {
        console.warn(
          `[KeyboardShortcuts] Shortcut ${matchedShortcut.id} has no action to dispatch`
        );
      }
    } else {
      // Uncomment for verbose debugging
      // console.log(`[KeyboardShortcuts] No shortcut matched for key: ${key}`);
    }
  }
});

export default keyboardShortcutsMiddleware;
