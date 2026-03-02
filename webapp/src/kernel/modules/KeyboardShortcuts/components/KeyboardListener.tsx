import React, { useEffect } from 'react';
import useModule from '@kernel/hooks/useModule';
import { Store } from '@kernel/modules/Store';
import { formatKeyEvent, shouldIgnoreKeyEvent } from '../utils';
import { keyPressed, addPressedKey, removePressedKey, clearPressedKeys } from '../store/actions';

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

const KeyboardListener: React.FC = () => {
  const storeModule = useModule<Store>('Store');
  const { useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we should ignore this event (e.g., typing in input field)
      if (shouldIgnoreKeyEvent(event)) {
        return;
      }
      
      // Normalize the key event to a standard format
      const key = formatKeyEvent(event);
      
      // Ignore empty keys (e.g., pressing only Shift)
      if (!key) {
        return;
      }
      
      // Split key into parts for visual feedback (e.g., "Alt+1" -> ["Alt", "1"])
      const keyParts = key.split('+');
      
      // Dispatch single action with all key information
      // This updates pressedKeys and triggers middleware in one dispatch
      dispatch(keyPressed(key, keyParts, {
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        key: event.key,
        code: event.code,
      }));
      
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
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      // Clear pressed keys when any key is released
      // This prevents stuck keys and resets the visual feedback
      // Use requestAnimationFrame to batch this with any pending renders
      requestAnimationFrame(() => {
        dispatch(clearPressedKeys());
      });
    };
    
    // Listen to keydown and keyup events globally
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dispatch]);
  
  // This component doesn't render anything
  return null;
};

export default KeyboardListener;
