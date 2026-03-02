/**
 * Redux slice for KeyboardShortcuts module
 */

import { createSlice } from '@reduxjs/toolkit';
import { MODULE_NAME } from '../constants';
import { initialState } from './state';
import {
  registerShortcut,
  unregisterShortcut,
  pushContext,
  popContext,
  setEnabled,
  toggleShowHints,  
  setShowHints,
  addPressedKey,
  removePressedKey,
  clearPressedKeys,
  keyPressed,
} from './actions';

const keyboardShortcutsSlice = createSlice({
  name: MODULE_NAME,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Register a new shortcut
    builder.addCase(registerShortcut, (state, action) => {
      const shortcut = action.payload;
      
      // Check for conflicts
      const existing = state.shortcuts[shortcut.id];
      if (existing) {
        console.warn(
          `[KeyboardShortcuts] Shortcut ${shortcut.id} already registered. Replacing.`
        );
      }
      
      // Register the shortcut
      state.shortcuts[shortcut.id] = {
        ...shortcut,
        enabled: shortcut.enabled ?? true,
      };
    });
    
    // Unregister a shortcut
    builder.addCase(unregisterShortcut, (state, action) => {
      const { shortcutId } = action.payload;
      delete state.shortcuts[shortcutId];
    });
    
    // Push a context onto the stack
    builder.addCase(pushContext, (state, action) => {
      const { contextId } = action.payload;
      
      // Prevent duplicate contexts in the stack
      if (state.contextStack[state.contextStack.length - 1] === contextId) {
        console.warn(
          `[KeyboardShortcuts] Context ${contextId} is already at the top of the stack`
        );
        return;
      }
      
      state.contextStack.push(contextId);
    });
    
    // Pop a context from the stack
    builder.addCase(popContext, (state) => {
      if (state.contextStack.length > 1) {
        state.contextStack.pop();
      } else {
        console.warn(
          '[KeyboardShortcuts] Cannot pop Global context from stack'
        );
      }
    });
    
    // Enable/disable shortcuts system
    builder.addCase(setEnabled, (state, action) => {
      state.enabled = action.payload.enabled;
    });
    
    // Toggle hint visibility
    builder.addCase(toggleShowHints, (state) => {
      state.showHints = !state.showHints;
    });
    
    // Set hint visibility
    builder.addCase(setShowHints, (state, action) => {
      state.showHints = action.payload.showHints;
    });
    
    // Handle key press - update pressed keys in single action for performance
    builder.addCase(keyPressed, (state, action) => {
      // Update pressed keys directly from keyParts for visual feedback
      // This eliminates the need for separate addPressedKey dispatches
      state.pressedKeys = action.payload.keyParts;
    });
    
    // Track pressed keys for visual feedback (legacy - kept for backwards compatibility)
    builder.addCase(addPressedKey, (state, action) => {
      const { key } = action.payload;
      if (!state.pressedKeys.includes(key)) {
        state.pressedKeys.push(key);
      }
    });
    
    builder.addCase(removePressedKey, (state, action) => {
      const { key } = action.payload;
      state.pressedKeys = state.pressedKeys.filter(k => k !== key);
    });
    
    builder.addCase(clearPressedKeys, (state) => {
      state.pressedKeys = [];
    });
  },
});

export default keyboardShortcutsSlice;
