# Store Module Design

This folder contains all Redux-related code for the KeyboardShortcuts module, following the Redux-first architecture pattern.

## Overview

The store module manages:
- **State**: Shortcuts registry, context stack, customizations
- **Actions**: Commands and events following `[ModuleName:Category:Command/Event]` pattern
- **Middlewares**: Core shortcut dispatcher and side effect handlers
- **Selectors**: Memoized state queries
- **Slice**: Reducers for state updates

## Files

- `state.ts` - TypeScript interfaces for state shape and initial state
- `actions.ts` - Redux action creators (commands and events)
- `slice.ts` - Redux slice with reducers
- `middlewares.ts` - Listener middleware for side effects
- `selectors.ts` - Memoized selectors for state queries

## Module Constants

Following the project's pattern, the module uses constants from `../constants.ts`:

```typescript
// Import ACTION_TYPES from kernel
import { ACTION_TYPES } from '@kernel/constants';
import { MODULE_NAME } from '../constants';

// ACTION_TYPES contains:
// {
//   EVENT: "Event",
//   COMMAND: "Command",
//   DOCUMENT: "Document"
// }

// Example action:
createAction(`[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save session`)
// Produces: "[KeyboardShortcuts:Command] Save session"
```

## Redux State Structure

```typescript
// state.ts
export interface KeyboardShortcutsState {
  // Shortcuts organized by context, then by key
  shortcuts: {
    [context: string]: {
      [key: string]: ShortcutDefinition
    }
  };
  
  // Active context stack (most recent last)
  contextStack: string[];
  
  // Global enable/disable
  enabled: boolean;
  
  // User customizations (action type -> custom key)
  customizations: {
    [actionType: string]: string;
  };
  
  // Recent executions for analytics/debugging
  recentExecutions: Array<{
    shortcut: ShortcutDefinition;
    timestamp: number;
  }>;
}

// Initial state
export const initialState: KeyboardShortcutsState = {
  shortcuts: {
    'Global': {} // Always present
  },
  contextStack: ['Global'],
  enabled: true,
  customizations: {},
  recentExecutions: []
};
```

## Redux Actions Structure

Following the project's command/event pattern:

```typescript
// actions.ts
import { ACTION_TYPES } from '@kernel/constants';
import { createAction } from '@reduxjs/toolkit';
import { MODULE_NAME } from '../constants';

// ============ Commands (imperative, Title Case) ============

/**
 * Dispatched when a keyboard event occurs
 */
export const keyPressed = createAction<{
  key: string;              // Normalized key (e.g., 'Ctrl+s', 'q')
  originalEvent: KeyboardEvent;
  timestamp: number;
}>(`[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Key pressed`);

/**
 * Register a new shortcut
 */
export const registerShortcut = createAction<ShortcutDefinition>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Register shortcut`
);

/**
 * Unregister a shortcut
 */
export const unregisterShortcut = createAction<{
  context: string;
  key: string;
}>(`[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Unregister shortcut`);

/**
 * Push a new context onto the stack
 */
export const pushContext = createAction<string>(
  `[${MODULE_NAME}:Context:${ACTION_TYPES.COMMAND}] Push context`
);

/**
 * Pop a context from the stack
 */
export const popContext = createAction<string>(
  `[${MODULE_NAME}:Context:${ACTION_TYPES.COMMAND}] Pop context`
);

/**
 * Enable/disable a specific shortcut
 */
export const setShortcutEnabled = createAction<{
  context: string;
  key: string;
  enabled: boolean;
}>(`[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Set shortcut enabled`);

/**
 * Customize a shortcut key binding
 */
export const customizeShortcut = createAction<{
  context: string;
  oldKey: string;
  newKey: string;
}>(`[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Customize shortcut`);

/**
 * Save session (persist customizations)
 */
export const saveSession = createAction(
  `[${MODULE_NAME}:Session:${ACTION_TYPES.COMMAND}] Save session`
);

// ============ Events (past-tense, lowercase) ============

/**
 * Dispatched after shortcut was registered
 */
export const shortcutRegistered = createAction<ShortcutDefinition>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] shortcut registered`
);

/**
 * Dispatched after shortcut was unregistered
 */
export const shortcutUnregistered = createAction<{
  context: string;
  key: string;
}>(`[${MODULE_NAME}:${ACTION_TYPES.EVENT}] shortcut unregistered`);

/**
 * Dispatched after a shortcut action was executed
 */
export const shortcutExecuted = createAction<{
  shortcut: ShortcutDefinition;
  timestamp: number;
}>(`[${MODULE_NAME}:${ACTION_TYPES.EVENT}] shortcut executed`);

/**
 * Dispatched when a shortcut conflict is detected
 */
export const shortcutConflictDetected = createAction<{
  context: string;
  key: string;
  shortcuts: ShortcutDefinition[];
}>(`[${MODULE_NAME}:${ACTION_TYPES.EVENT}] shortcut conflict detected`);

/**
 * Dispatched after context was pushed
 */
export const contextPushed = createAction<string>(
  `[${MODULE_NAME}:Context:${ACTION_TYPES.EVENT}] context pushed`
);

/**
 * Dispatched after context was popped
 */
export const contextPopped = createAction<string>(
  `[${MODULE_NAME}:Context:${ACTION_TYPES.EVENT}] context popped`
);

/**
 * Dispatched after session was saved
 */
export const sessionSaved = createAction(
  `[${MODULE_NAME}:Session:${ACTION_TYPES.EVENT}] session saved`
);
```

## Middleware Implementation

The core logic uses Redux Toolkit's listener middleware:

```typescript
// middlewares.ts
import { createListenerMiddleware, PayloadAction } from '@reduxjs/toolkit';
import {
  keyPressed,
  registerShortcut,
  shortcutRegistered,
  shortcutExecuted,
  shortcutConflictDetected,
  pushContext,
  contextPushed,
  popContext,
  contextPopped,
  saveSession,
  sessionSaved,
} from './actions';
import { selectActiveShortcutsForKey, selectContextStack } from './selectors';
import { KeyboardShortcutsState } from './state';

const storage = globalThis.electron.storage;
const middlewares = createListenerMiddleware();

/**
 * Handle key press events - core shortcut dispatcher
 */
middlewares.startListening({
  actionCreator: keyPressed,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const state = getState() as { KeyboardShortcuts: KeyboardShortcutsState };
    
    const { key, originalEvent } = payload;
    
    // Check if shortcuts are globally enabled
    if (!state.KeyboardShortcuts.enabled) {
      return;
    }
    
    // Get context stack
    const contextStack = selectContextStack(state);
    
    // Find matching shortcut (most specific context first)
    for (let i = contextStack.length - 1; i >= 0; i--) {
      const context = contextStack[i];
      const matchingShortcuts = selectActiveShortcutsForKey(state, context, key);
      
      if (matchingShortcuts.length > 0) {
        // Sort by priority (descending)
        matchingShortcuts.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        
        const shortcut = matchingShortcuts[0];
        
        // Prevent default browser behavior
        originalEvent.preventDefault();
        originalEvent.stopPropagation();
        
        // Dispatch the target action
        dispatch({
          type: shortcut.actionType,
          payload: shortcut.payload,
          meta: { triggeredBy: 'keyboard-shortcut', key }
        });
        
        // Dispatch execution event for tracking
        dispatch(shortcutExecuted({
          shortcut,
          timestamp: Date.now()
        }));
        
        return; // Stop searching
      }
    }
  }
});

/**
 * Handle shortcut registration
 */
middlewares.startListening({
  actionCreator: registerShortcut,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const state = getState() as { KeyboardShortcuts: KeyboardShortcutsState };
    
    // Check for conflicts
    const existing = state.KeyboardShortcuts.shortcuts[payload.context]?.[payload.key];
    
    if (existing) {
      console.warn(
        `[KeyboardShortcuts] Conflict detected for key "${payload.key}" in context "${payload.context}"`,
        '\nExisting:', existing,
        '\nNew:', payload
      );
      
      dispatch(shortcutConflictDetected({
        context: payload.context,
        key: payload.key,
        shortcuts: [existing, payload]
      }));
    }
    
    // Reducers will handle state update
    dispatch(shortcutRegistered(payload));
  }
});

/**
 * Handle context push
 */
middlewares.startListening({
  actionCreator: pushContext,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    
    console.debug(`[KeyboardShortcuts] Context pushed: ${payload}`);
    
    // Reducer handles state update
    dispatch(contextPushed(payload));
  }
});

/**
 * Handle context pop
 */
middlewares.startListening({
  actionCreator: popContext,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    
    console.debug(`[KeyboardShortcuts] Context popped: ${payload}`);
    
    // Reducer handles state update
    dispatch(contextPopped(payload));
  }
});

/**
 * Persist customizations on session save
 */
middlewares.startListening({
  actionCreator: saveSession,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const { KeyboardShortcuts: state } = getState() as { 
      KeyboardShortcuts: KeyboardShortcutsState 
    };
    
    // Persist user customizations
    if (Object.keys(state.customizations).length > 0) {
      try {
        const sessionPath = await storage.getSessionPath('KeyboardShortcuts');
        await storage.writeJSON(
          `${sessionPath}/customizations.json`,
          state.customizations
        );
        console.log('[KeyboardShortcuts] Session saved');
      } catch (error) {
        console.error('[KeyboardShortcuts] Failed to save session:', error);
      }
    }
    
    dispatch(sessionSaved());
  }
});

export default middlewares;
```

## Redux Slice & Reducers

```typescript
// slice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initialState, KeyboardShortcutsState } from './state';
import {
  shortcutRegistered,
  shortcutUnregistered,
  contextPushed,
  contextPopped,
  setShortcutEnabled,
  customizeShortcut,
  shortcutExecuted,
} from './actions';

const keyboardShortcutsSlice = createSlice({
  name: 'KeyboardShortcuts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Register shortcut
    builder.addCase(shortcutRegistered, (state, action) => {
      const { context, key } = action.payload;
      
      if (!state.shortcuts[context]) {
        state.shortcuts[context] = {};
      }
      
      state.shortcuts[context][key] = action.payload;
    });
    
    // Unregister shortcut
    builder.addCase(shortcutUnregistered, (state, action) => {
      const { context, key } = action.payload;
      
      if (state.shortcuts[context]?.[key]) {
        delete state.shortcuts[context][key];
      }
    });
    
    // Push context
    builder.addCase(contextPushed, (state, action) => {
      if (!state.contextStack.includes(action.payload)) {
        state.contextStack.push(action.payload);
      }
    });
    
    // Pop context
    builder.addCase(contextPopped, (state, action) => {
      const index = state.contextStack.indexOf(action.payload);
      if (index > 0) { // Don't remove 'Global'
        state.contextStack.splice(index, 1);
      }
    });
    
    // Set enabled state
    builder.addCase(setShortcutEnabled, (state, action) => {
      const { context, key, enabled } = action.payload;
      
      if (state.shortcuts[context]?.[key]) {
        state.shortcuts[context][key].enabled = enabled;
      }
    });
    
    // Customize shortcut
    builder.addCase(customizeShortcut, (state, action) => {
      const { context, oldKey, newKey } = action.payload;
      
      if (state.shortcuts[context]?.[oldKey]) {
        const shortcut = state.shortcuts[context][oldKey];
        
        // Store customization
        state.customizations[shortcut.actionType] = newKey;
        
        // Move shortcut to new key
        state.shortcuts[context][newKey] = {
          ...shortcut,
          key: newKey
        };
        
        delete state.shortcuts[context][oldKey];
      }
    });
    
    // Track execution
    builder.addCase(shortcutExecuted, (state, action) => {
      state.recentExecutions.unshift({
        shortcut: action.payload.shortcut,
        timestamp: action.payload.timestamp
      });
      
      // Keep only last 50 executions
      if (state.recentExecutions.length > 50) {
        state.recentExecutions = state.recentExecutions.slice(0, 50);
      }
    });
  }
});

export default keyboardShortcutsSlice.reducer;
```

## Selectors

```typescript
// selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import { KeyboardShortcutsState } from './state';

const selectKeyboardShortcuts = (state: { KeyboardShortcuts: KeyboardShortcutsState }) =>
  state.KeyboardShortcuts;

export const selectContextStack = createSelector(
  [selectKeyboardShortcuts],
  (state) => state.contextStack
);

export const selectAllShortcuts = createSelector(
  [selectKeyboardShortcuts],
  (state) => state.shortcuts
);

export const selectShortcutsByContext = createSelector(
  [selectAllShortcuts, (_state: any, context: string) => context],
  (shortcuts, context) => shortcuts[context] || {}
);

export const selectActiveShortcutsForKey = createSelector(
  [selectShortcutsByContext, (_state: any, _context: string, key: string) => key],
  (contextShortcuts, key) => {
    const shortcut = contextShortcuts[key];
    return shortcut && shortcut.enabled !== false ? [shortcut] : [];
  }
);

export const selectCurrentContext = createSelector(
  [selectContextStack],
  (stack) => stack[stack.length - 1]
);

export const selectActiveShortcuts = createSelector(
  [selectAllShortcuts, selectContextStack],
  (shortcuts, contextStack) => {
    const active: ShortcutDefinition[] = [];
    
    // Collect shortcuts from all active contexts
    contextStack.forEach(context => {
      if (shortcuts[context]) {
        Object.values(shortcuts[context]).forEach(shortcut => {
          if (shortcut.enabled !== false) {
            active.push(shortcut);
          }
        });
      }
    });
    
    return active;
  }
);

export const selectCustomizations = createSelector(
  [selectKeyboardShortcuts],
  (state) => state.customizations
);

export const selectRecentExecutions = createSelector(
  [selectKeyboardShortcuts],
  (state) => state.recentExecutions
);
```

## Data Flow

The data flow through the store follows this pattern:

1. **User presses key** → KeyboardListener dispatches `keyPressed` command action
2. **Middleware intercepts** → Searches context stack for matching shortcut
3. **Target action dispatched** → Middleware dispatches target module's command action with `meta.triggeredBy: 'keyboard-shortcut'`
4. **Module middleware handles** → Target module's middleware performs side effects
5. **Event dispatched** → Module middleware dispatches event action
6. **Reducer updates state** → Event reducer updates state immutably
7. **UI re-renders** → Components subscribed via useSelector re-render

All state changes flow through Redux, making the system fully traceable and testable.
