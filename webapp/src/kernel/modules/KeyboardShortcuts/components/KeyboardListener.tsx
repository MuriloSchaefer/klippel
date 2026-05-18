import React, { useCallback, useEffect } from 'react';
import { useStore } from 'react-redux';
import useModule from '@kernel/hooks/useModule';
import { Store } from '@kernel/modules/Store';
import { formatKeyEvent, shouldIgnoreKeyEvent } from '../utils';
import { keyPressed, toggleShowHints } from '../store/actions';
import { selectPressedKeys } from '../store';
import { selectShortcutByKey, selectEnabled } from '../store/selectors';

/**
 * KeyboardListener is a global component that captures all keyboard events
 * and dispatches them to Redux for processing by the KeyboardShortcuts middleware.
 * 
 * This component should be mounted once at the application root level.
 */

export interface KeyPressedAction {
  type: string;
  payload: {
    key: string;
    originalEvent: {
      ctrlKey: boolean;
      altKey: boolean;
      shiftKey: boolean;
      metaKey: boolean;
      key: string;
      code: string;
    };
  };
}

const preventPropagation = (event: KeyboardEvent) =>{
    // Prevent default for any Alt+Number and Alt+Letter combinations
    // to avoid triggering OS/browser shortcuts
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      // Prevent Alt+Number (1-9)
      if (event.key >= '1' && event.key <= '9') {
        event.preventDefault();
      }
      // Prevent Alt+Letters (common shortcuts like Alt+R)
      else if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
        event.preventDefault();
      }
    }
    // Prevent Ctrl+W from triggering Chromium's built-in window-close behavior
    // so the app's own shortcut handler (close active viewport) can run instead.
    if (event.ctrlKey && !event.altKey && !event.metaKey && event.key === 'w') {
      event.preventDefault();
    }
    // Prevent Ctrl+M from being swallowed by the OS / window manager (e.g.
    // window minimize on some desktops) so the app's focus-material-list
    // shortcut runs instead.
    if (event.ctrlKey && !event.altKey && !event.metaKey && (event.key === 'm' || event.key === 'M')) {
      event.preventDefault();
    }
    // Prevent Ctrl+Alt+letter from being swallowed by the OS / window manager
    // (e.g. GNOME maps Ctrl+Alt+D to "Show Desktop") so app shortcuts run.
    if (
      event.ctrlKey &&
      event.altKey &&
      !event.metaKey &&
      event.code &&
      event.code.startsWith('Key')
    ) {
      event.preventDefault();
    }
    // Plain Alt press would activate Chromium/Electron's native menu accelerator
    // on keyup, which steals focus from the renderer — after that, no key events
    // reach the window. Suppress the default to keep focus here.
    if (event.key === 'Alt' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
    }
}

const MODIFIER_ONLY_KEYS = new Set([
  'Ctrl',
  'Alt',
  'Shift',
  'Ctrl+Alt',
  'Ctrl+Shift',
  'Alt+Shift',
  'Ctrl+Alt+Shift',
]);

const KeyboardListener: React.FC = () => {
  const storeModule = useModule<Store>('Store');
  const { useAppDispatch, useAppSelector } = storeModule.hooks;
  const dispatch = useAppDispatch();
  const pressedKeys = useAppSelector(selectPressedKeys)
  const store = useStore();
  
  // Track if Alt was pressed alone (no other keys pressed while held)

  const handleKeyDown = useCallback((event: KeyboardEvent)=>{
    // Check if we should ignore this event (e.g., typing in input field)
      if (shouldIgnoreKeyEvent(event)) {
        return;
      }
      preventPropagation(event)

      // Normalize the key event to a standard format
      const key = formatKeyEvent(event);

      // Build keyParts for visual feedback
      let keyParts: string[] = [];

      if (!key) {
        // For modifier-only presses, track which modifiers are held
        // This allows visual feedback even when no shortcut is triggered
        if (event.ctrlKey || event.metaKey) keyParts.push('Ctrl');
        if (event.altKey) keyParts.push('Alt');
        if (event.shiftKey) keyParts.push('Shift');

        // If no modifiers at all, ignore this event
        if (keyParts.length === 0) {
          return;
        }
      } else {
        // Split key into parts for visual feedback (e.g., "Alt+1" -> ["Alt", "1"])
        keyParts = key.split('+');
      }

      // If this keydown matches an enabled shortcut in the active context,
      // cancel the browser default. Mirrors the gating in middleware.ts so we
      // only suppress the default action for keys that will fire a shortcut.
      // Without this, e.g. Enter that closes a modal would be re-fired as an
      // implicit click on the trigger button MUI's Modal refocuses on close.
      const matchKey = key || keyParts.join('+');
      if (matchKey && !MODIFIER_ONLY_KEYS.has(matchKey)) {
        const state = store.getState();
        if (selectEnabled(state) && selectShortcutByKey(matchKey)(state)) {
          event.preventDefault();
        }
      }
      
      const currState = new Set(pressedKeys)
      const newState = new Set(keyParts)
      if (
        currState.size === newState.size &&
        [...currState].every((x) => newState.has(x))
      ){
        return
      }
      // Dispatch single action with all key information
      // This updates pressedKeys and triggers middleware in one dispatch
      dispatch(keyPressed(key || keyParts.join('+'), keyParts, {
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        key: event.key,
        code: event.code,
      }));
      

  }, [pressedKeys])

  const handleKeyUp = useCallback((event: KeyboardEvent)=>{
    // Mirror the keydown guard: plain Alt keyup is the trigger for the native
    // menu accelerator in Chromium/Electron. Suppress it to keep focus in the
    // renderer.
    if (event.key === 'Alt' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
    }
    // Check if right Alt was released and it was pressed alone - toggle hints
    if (event.key === 'AltGraph' && pressedKeys.length === 1 && pressedKeys[0] === 'AltGraph') {
      dispatch(toggleShowHints());
    }

    // Normalize the released key to match the stored format in pressedKeys.
    // formatKeyEvent maps 'Control'/'Meta' → 'Ctrl', so the filter must use the same name.
    const normalizeReleasedKey = (key: string): string => {
      if (key === 'Control' || key === 'Meta') return 'Ctrl';
      if (key.length === 1) return key.toLowerCase();
      return key;
    };

    const remainingKeys = pressedKeys.filter(pk => pk !== normalizeReleasedKey(event.key))

    const currState = new Set(pressedKeys)
    const newState = new Set(remainingKeys)
    if (
      currState.size === newState.size &&
      [...currState].every((x) => newState.has(x))
    ){
      return
    }
    // Clear pressed keys when any key is released. Dispatch synchronously:
    // wrapping this in requestAnimationFrame defers the pressedKeys update to
    // the next browser frame, but the keydown handler's dedupe check reads
    // pressedKeys synchronously. Two rapid keydown→keyup→keydown cycles
    // (e.g. count>1 ArrowUp navigation in tests) can land the second keydown
    // before the rAF fires, in which case the dedupe sees the still-pressed
    // key and silently drops the second keypress.
    dispatch(keyPressed(remainingKeys.join('+'), remainingKeys, {
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      key: event.key,
      code: event.code,
    }, 'up'));

  }, [pressedKeys])
  
  useEffect(() => {
    // Capture phase: MUI Modal stops propagation of Escape after handling it
    // internally, which would prevent shortcut matching for windows that own
    // Esc layering (e.g. PointerContainer). Listening in capture lets us see
    // the keydown before MUI swallows it.
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [dispatch, pressedKeys]);
  
  // This component doesn't render anything
  return null;
};

export default KeyboardListener;
