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
import { persistState } from './slice';
import { KeyboardShortcutsState } from './state';
import { saveSession, sessionSaved } from '@kernel/modules/Store/actions';

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

    const { key, phase } = action.payload;

    // Only trigger shortcuts on keydown — keyup dispatches are for visual feedback only
    if (phase === 'up') return;

    // Skip shortcut matching for modifier-only presses (just visual feedback)
    if (key === 'Ctrl' || key === 'Alt' || key === 'Shift' || key === 'Ctrl+Alt' || key === 'Ctrl+Shift' || key === 'Alt+Shift' || key === 'Ctrl+Alt+Shift') {
      return;
    }

    // Try to find a matching shortcut
    const matchedShortcut = selectShortcutByKey(key)(state);

    if (matchedShortcut) {

      // Dispatch the shortcut's action
      if (matchedShortcut.action) {
        dispatch(matchedShortcut.action as any);
      }
    } 
  }
});

// Listen for session save requests and persist state
keyboardShortcutsMiddleware.startListening({
  actionCreator: saveSession,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    
    const { KeyboardShortcuts: state } = getState() as { KeyboardShortcuts: KeyboardShortcutsState };
    persistState(state);
    
    dispatch(sessionSaved());
  }
});

export default keyboardShortcutsMiddleware;
