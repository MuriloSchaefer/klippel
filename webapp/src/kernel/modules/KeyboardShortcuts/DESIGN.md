# Keyboard Shortcuts System - Design Document

## Overview

This document describes the design and implementation of a context-sensitive keyboard shortcut system inspired by Age of Empires 4. The system allows different modules to register the same keys for different actions, with the active context determining which action is executed.

**Key Principle: Redux-First Architecture** - All shortcuts dispatch Redux actions. The KeyboardShortcuts middleware intercepts key presses and dispatches the appropriate module action. Module middlewares handle the business logic. No direct function calls.

**Action Naming Convention**: This project uses a standardized action naming format: `[ModuleName:Command/Event] Action description`. Commands use imperative verbs with Title Case, events use past tense with lowercase. See [Best Practices](#best-practices) section for details.

## Quick Start

### For Module Authors

**1. Define actions following the project convention:**

```typescript
// In your module's store/actions.ts
import { ACTION_TYPES } from '@kernel/constants';
import { createAction } from '@reduxjs/toolkit';
import { MODULE_NAME } from '../constants';

// Command (imperative, Title Case)
export const saveComposition = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save composition`
);

export const addKeyframe = createAction(
  `[${MODULE_NAME}:Timeline:${ACTION_TYPES.COMMAND}] Add keyframe`
);

// Event (past tense, lowercase)
export const keyframeAdded = createAction<{ keyframe: any }>(
  `[${MODULE_NAME}:Timeline:${ACTION_TYPES.EVENT}] keyframe added`
);
```

**2. Define shortcuts in your module:**

```typescript
// In your module's index.ts
import { saveComposition, addKeyframe } from './store/actions';

const MyModule: IModule = {
  name: 'MyModule',
  // ...
  shortcuts: {
    'MyModule': {
      label: 'My Module Actions',
      shortcuts: [
        {
          key: 'Ctrl+s',
          actionType: saveComposition.type,  // Uses action type string
          label: 'Save'
        }
      ]
    },
    'MyModule.Component': {
      label: 'Component Actions',
      shortcuts: [
        {
          key: 'q',
          actionType: addKeyframe.type,
          label: 'Add keyframe'
        }
      ]
    }
  }
};
```

**3. Handle actions in your middleware:**

```typescript
// In your module's store/middlewares.ts
middlewares.startListening({
  actionCreator: addKeyframe,
  effect: async (action, listenerApi) => {
    // action.meta.triggeredBy === 'keyboard-shortcut' when from shortcut
    // Perform your business logic
    dispatch(keyframeAdded({ keyframe }));
  }
});
```

**3. Use in components:**

```typescript
// Declarative with component
<ShortcutButton
  shortcutKey="q"
  actionType={addKeyframe.type}
>
  Add Keyframe
</ShortcutButton>

// Imperative with hook
useShortcut({
  key: 'Space',
  actionType: togglePlayback.type,
  label: 'Play/Pause'
}, []);

// Context scoping
<ShortcutProvider context="MyComponent">
  {/* Shortcuts here are in 'MyModule.MyComponent' context */}
</ShortcutProvider>
```

## Design Goals

1. **Context-Sensitive**: The same key can trigger different actions depending on which module/component is active
2. **Modular Registration**: Modules register their shortcuts at startup via the `IModule` interface
3. **Component-Wrapped**: Buttons and actions are wrapped with shortcut metadata for automatic registration
4. **Visual Feedback**: Users can see which keys are bound to visible actions
5. **Conflict Resolution**: Clear priority rules when multiple contexts are active
6. **Discoverable**: Users can view and customize all available shortcuts
7. **Reusable Keys**: Maximize keyboard real estate by context-based key reuse

## Architecture

### Core Components

```
KeyboardShortcuts (Kernel Module)
├── store/
│   ├── slice.ts                    # Redux state for shortcuts & context stack
│   ├── actions.ts                  # Command & event actions
│   ├── selectors.ts                # Select shortcuts by context
│   └── middlewares.ts              # Handle key press events & dispatch
├── managers/
│   └── useShortcutManager.ts       # Facade for registering shortcuts
├── components/
│   ├── ShortcutButton.tsx          # Wrapper for buttons with shortcuts
│   ├── ShortcutProvider.tsx        # Context provider for shortcut scopes
│   ├── KeyboardListener.tsx        # Global keyboard event listener
│   └── ShortcutOverlay.tsx         # Visual overlay showing active shortcuts
├── hooks/
│   ├── useShortcut.ts              # Register imperative shortcuts
│   ├── useShortcutContext.ts       # Manage shortcut contexts
│   └── useActiveShortcuts.ts       # Query active shortcuts
└── kernelCalls/
    └── startModule.ts              # Module initialization & middleware registration
```

### Redux-Centric Design

This system is built **Redux-first**, following the project's established patterns:

1. **All state lives in Redux** - shortcuts, context stack, enabled states
2. **Middlewares handle side effects** - keyboard events trigger Redux actions, middlewares dispatch target actions
3. **Command/Event pattern** - keyboard events are commands, modules respond via events
4. **Listener middleware** - uses `createListenerMiddleware()` from Redux Toolkit
5. **Action naming** - follows `[ModuleName:Category:Command/Event]` pattern from `@kernel/constants`

### Module Constants

Following the project's pattern, define module name constant:

```typescript
// constants.ts (KeyboardShortcuts module)
export const MODULE_NAME = 'KeyboardShortcuts';
export const MODULE_VERSION = '0.1.0';
```

```typescript
// constants.ts (Composer module)
export const MODULE_NAME = 'Composer';
export const MODULE_VERSION = '1.0.0';
```

These constants are used in action definitions:

```typescript
// Import ACTION_TYPES from kernel
import { ACTION_TYPES } from '@kernel/constants';

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

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Interaction                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  KeyboardListener Component (Global)                            │
│  - Listens to window keydown events                             │
│  - Filters out input fields                                     │
│  - Normalizes key to string (e.g., 'Ctrl+s', 'q')             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ dispatch(keyPressed({ key, event }))
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Redux Store - KeyboardShortcuts State                          │
│  - shortcuts: { [context]: { [key]: ShortcutDefinition } }     │
│  - contextStack: ['Global', 'Composer', 'Composer.Viewport']  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ keyPressed action
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  KeyboardShortcuts Middleware                                   │
│  1. Listens for keyPressed action                               │
│  2. Searches context stack (most specific → general)           │
│  3. Finds matching shortcut by key                              │
│  4. Prevents default browser behavior                           │
│  5. Dispatches target action with meta.triggeredBy             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ dispatch({
                                │   type: addKeyframe.type,  // '[Composer:Timeline:Command] Add keyframe'
                                │   payload: { ... },
                                │   meta: { triggeredBy: 'keyboard-shortcut', key: 'q' }
                                │ })
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Target Module Middleware (e.g., Composer)                      │
│  - Listens for addKeyframe action                               │
│  - Checks if triggered by shortcut via meta.triggeredBy        │
│  - Performs side effects (create keyframe, save, etc.)         │
│  - Dispatches event action (keyframeAdded)                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ dispatch(keyframeAdded({ keyframe }))
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Target Module Reducer                                          │
│  - Handles keyframeAdded event                                  │
│  - Updates state immutably                                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  React Components (UI Update)                                   │
│  - Subscribed via useSelector                                   │
│  - Re-render with new state                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key Benefits of This Flow:**
- Clear separation of concerns (listening → matching → dispatching → handling)
- All state changes are traceable through Redux DevTools
- Middlewares can inspect `action.meta.triggeredBy` to differentiate shortcut vs. UI triggers
- Multiple middlewares can respond to the same action
- Easy to test each layer independently

### Key Concepts

#### 1. Shortcut Definition

```typescript
interface ShortcutDefinition {
  key: string;                    // e.g., 'q', 'w', 'Shift+a'
  actionType: string;             // Redux action type to dispatch
                                  // Format: '[ModuleName:Command] Action'
                                  // Example: '[Composer:Timeline:Command] Add keyframe'
  label: string;                  // User-facing description
  context: string;                // Context identifier (module name + scope)
  priority?: number;              // Higher priority wins conflicts (default: 0)
  enabled?: boolean;              // Whether shortcut is currently active
  icon?: React.ReactNode;         // Optional icon for visual display
  payload?: any;                  // Optional payload for the action
  metadata?: {
    category?: string;            // Group shortcuts (e.g., 'Navigation', 'Editing')
    customizable?: boolean;       // Can user change this key?
  }
}

// Example definition:
// {
//   key: 'q',
//   actionType: addKeyframe.type,  // '[Composer:Timeline:Command] Add keyframe'
//   label: 'Add keyframe at current time',
//   context: 'Composer.Viewport.Timeline',
//   priority: 10,
//   enabled: true
// }

// Shortcuts dispatch Redux actions, not direct functions
// This allows middlewares to handle side effects and maintain Redux flow
```

#### 2. Context Hierarchy

Contexts are hierarchical strings using dot notation:

```
Composer                          # Module level
Composer.Viewport                 # Viewport within module
Composer.Viewport.Timeline        # Specific component
Materials.Browser                 # Different module's context
```

**Priority Rules:**
- More specific contexts have higher priority (longer path)
- Equal specificity: explicit priority value breaks ties
- Equal priority: last registered wins (with console warning)

#### 3. Context Stack

The system maintains a stack of active contexts:

```typescript
// Example stack when Timeline viewport is focused in Composer
[
  'Global',                    // Always active
  'Composer',                  // Module active
  'Composer.Viewport',         // Viewport has focus
  'Composer.Viewport.Timeline' // Timeline is the focused element
]
```

When a key is pressed:
1. Search from top of stack (most specific) to bottom (global)
2. Execute first enabled matching shortcut
3. Stop propagation (unless shortcut explicitly allows pass-through)

## Redux & Middleware Integration

### Action Flow Architecture

The keyboard shortcut system follows a **command → middleware → event** pattern:

```
User presses key
    ↓
KeyboardListener component detects keypress
    ↓
Dispatches: keyPressed({ key: 'q', event })
    ↓
KeyboardShortcuts middleware intercepts
    ↓
Matches shortcut in current context
    ↓
Dispatches target action: timeline/addKeyframe
    ↓
Target module's middleware handles action
    ↓
Dispatches event: timeline/keyframeAdded
    ↓
UI updates via reducers
```

### Redux Actions Structure

Following the project's command/event pattern:

```typescript
// store/actions.ts
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

### Middleware Implementation

The core logic uses Redux Toolkit's listener middleware:

```typescript
// store/middlewares.ts
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

### Redux State Structure

```typescript
// store/state.ts
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

### Redux Slice & Reducers

```typescript
// store/slice.ts
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

### Selectors

```typescript
// store/selectors.ts
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



### IModule Extension

Extend the `IModule` interface to support shortcut registration:

```typescript
export interface IModule {
  name: string;
  version: string;
  depends_on: string[];
  
  // Existing fields...
  components?: ComponentsMap;
  store?: {
    actions?: {
      commands?: { [key: string]: any };
      events?: { [key: string]: any };
    };
    middlewares?: ListenerMiddlewareInstance[];
    selectors?: { [key: string]: any };
    reducers?: { [key: string]: Reducer<any, AnyAction> };
  };
  kernelCalls: KernelCalls;
  
  // NEW: Shortcut definitions
  shortcuts?: {
    [contextName: string]: ShortcutGroup
  };
}

interface ShortcutGroup {
  label: string;                          // Group display name
  shortcuts: Array<{
    key: string;
    actionType: string;                   // Redux action type from action creator
                                          // Example: saveComposition.type
                                          //   → '[Composer:Command] Save composition'
    label: string;
    priority?: number;
    payload?: any;                        // Optional payload for the action
    metadata?: {
      category?: string;
      customizable?: boolean;
    };
  }>;
}
```

### Module Registration Example

```typescript
// In a module's index.ts
import { IModule } from '@kernel/modules/base';
import { saveComposition, undo, redo } from './store/actions';
import composerMiddlewares from './store/middlewares';
import composerReducer from './store/slice';

const ComposerModule: IModule = {
  name: 'Composer',
  version: '1.0.0',
  depends_on: ['Layout', 'Graph', 'KeyboardShortcuts'],
  
  // Define shortcuts - they dispatch Redux actions
  shortcuts: {
    // Root module shortcuts
    'Composer': {
      label: 'Composer Actions',
      shortcuts: [
        {
          key: 'Ctrl+s',
          actionType: saveComposition.type,    // Use action creator's type
          label: 'Save composition',
          priority: 100,
          metadata: { category: 'File', customizable: true }
        },
        {
          key: 'Ctrl+z',
          actionType: undo.type,
          label: 'Undo',
          priority: 100
        },
        {
          key: 'Ctrl+y',
          actionType: redo.type,
          label: 'Redo',
          priority: 100
        }
      ]
    },
    
    // Viewport-specific shortcuts
    'Composer.Viewport': {
      label: 'Viewport Navigation',
      shortcuts: [
        {
          key: 'w',
          actionType: 'composer/panViewport',
          label: 'Pan up',
          payload: { direction: 'up' }      // Pass payload to action
        },
        {
          key: 'a',
          actionType: 'composer/panViewport',
          label: 'Pan left',
          payload: { direction: 'left' }
        },
        {
          key: 's',
          actionType: 'composer/panViewport',
          label: 'Pan down',
          payload: { direction: 'down' }
        },
        {
          key: 'd',
          actionType: 'composer/panViewport',
          label: 'Pan right',
          payload: { direction: 'right' }
        }
      ]
    },
    
    // Timeline-specific shortcuts
    'Composer.Viewport.Timeline': {
      label: 'Timeline Controls',
      shortcuts: [
        {
          key: 'q',
          actionType: 'composer/addKeyframe',
          label: 'Add keyframe',
        },
        {
          key: 'e',
          actionType: 'composer/deleteKeyframe',
          label: 'Delete keyframe',
        },
        {
          key: 'Space',
          actionType: 'composer/togglePlayback',
          label: 'Play/Pause',
        }
      ]
    }
  },
  
  store: {
    actions: {
      commands: {
        saveComposition,
        undo,
        redo,
        // ... other commands
      },
      events: {
        // ... events
      }
    },
    middlewares: [composerMiddlewares],
    reducers: { composer: composerReducer }
  },
  
  // ... rest of module definition
};

export default ComposerModule;
```

### Startup Registration

During module startup, the KeyboardShortcuts module processes shortcuts from all loaded modules:

```typescript
// In KeyboardShortcuts/kernelCalls/startModule.ts
import { StartModuleProps } from '@kernel/modules/base';
import { registerShortcut } from '../store/actions';

export function start({ dispatch, managers }: StartModuleProps) {
  const modulesManager = managers.storeManager.functions.getModulesManager();
  
  // Register shortcuts from all loaded modules
  modulesManager.getLoadedModules().forEach(module => {
    if (module.shortcuts) {
      Object.entries(module.shortcuts).forEach(([context, group]) => {
        const fullContext = context === module.name ? module.name : context;
        
        group.shortcuts.forEach(shortcut => {
          // Dispatch registerShortcut command
          // The middleware will handle registration and validation
          dispatch(registerShortcut({
            key: shortcut.key,
            actionType: shortcut.actionType,
            label: shortcut.label,
            context: fullContext,
            priority: shortcut.priority,
            payload: shortcut.payload,
            metadata: shortcut.metadata,
            enabled: true
          }));
        });
      });
    }
  });
  
  console.log('[KeyboardShortcuts] Module started and shortcuts registered');
}
```

### Module Actions Definition

The module must define its actions following the project's conventions:

```typescript
// In Composer module's store/actions.ts
import { ACTION_TYPES } from '@kernel/constants';
import { createAction } from '@reduxjs/toolkit';
import { MODULE_NAME } from '../constants';

// ============ Commands ============

export const saveComposition = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save composition`
);

export const undo = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Undo`
);

export const redo = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Redo`
);

export const panViewport = createAction<{ direction: 'up' | 'down' | 'left' | 'right' }>(
  `[${MODULE_NAME}:Viewport:${ACTION_TYPES.COMMAND}] Pan viewport`
);

export const zoomIn = createAction(
  `[${MODULE_NAME}:Viewport:${ACTION_TYPES.COMMAND}] Zoom in`
);

export const zoomOut = createAction(
  `[${MODULE_NAME}:Viewport:${ACTION_TYPES.COMMAND}] Zoom out`
);

export const addKeyframe = createAction(
  `[${MODULE_NAME}:Timeline:${ACTION_TYPES.COMMAND}] Add keyframe`
);

export const deleteKeyframe = createAction(
  `[${MODULE_NAME}:Timeline:${ACTION_TYPES.COMMAND}] Delete keyframe`
);

export const togglePlayback = createAction(
  `[${MODULE_NAME}:Timeline:${ACTION_TYPES.COMMAND}] Toggle playback`
);

// ============ Events ============

export const compositionSaved = createAction<{ timestamp: number }>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] composition saved`
);

export const undone = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] undone`
);

export const redone = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] redone`
);

export const viewportPanned = createAction<{
  direction: string;
  newPosition: { x: number; y: number };
}>(`[${MODULE_NAME}:Viewport:${ACTION_TYPES.EVENT}] viewport panned`);

export const viewportZoomedIn = createAction(
  `[${MODULE_NAME}:Viewport:${ACTION_TYPES.EVENT}] viewport zoomed in`
);

export const viewportZoomedOut = createAction(
  `[${MODULE_NAME}:Viewport:${ACTION_TYPES.EVENT}] viewport zoomed out`
);

export const keyframeAdded = createAction<{ keyframe: any }>(
  `[${MODULE_NAME}:Timeline:${ACTION_TYPES.EVENT}] keyframe added`
);

export const keyframeDeleted = createAction<{ keyframeId: string }>(
  `[${MODULE_NAME}:Timeline:${ACTION_TYPES.EVENT}] keyframe deleted`
);

export const playbackToggled = createAction<{ isPlaying: boolean }>(
  `[${MODULE_NAME}:Timeline:${ACTION_TYPES.EVENT}] playback toggled`
);
```

### Module Middleware Handles Actions

The module's middleware responds to shortcut-dispatched actions:

```typescript
// In Composer module's store/middlewares.ts
import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  saveComposition,
  compositionSaved,
  panViewport,
  viewportPanned,
  addKeyframe,
  keyframeAdded,
  togglePlayback,
  playbackToggled,
} from './actions';
import { ComposerModuleState } from '../typings';

const middlewares = createListenerMiddleware();

// Handle save triggered by Ctrl+S shortcut
middlewares.startListening({
  actionCreator: saveComposition,
  effect: async (action, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const { Composer: state } = getState() as { Composer: ComposerModuleState };
    
    // Check if triggered by keyboard shortcut
    const triggeredByShortcut = action.meta?.triggeredBy === 'keyboard-shortcut';
    
    if (triggeredByShortcut) {
      console.log(`[Composer] Save triggered by key: ${action.meta.key}`);
    }
    
    // Perform save operation
    await persistComposition(state);
    
    // Dispatch success event
    dispatch(compositionSaved({ timestamp: Date.now() }));
  }
});

// Handle pan triggered by WASD shortcuts
middlewares.startListening({
  actionCreator: panViewport,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const { Composer: state } = getState() as { Composer: ComposerModuleState };
    
    // payload.direction is 'up', 'left', 'down', or 'right' from shortcut definition
    const panAmount = 50; // pixels
    const delta = {
      up: { x: 0, y: -panAmount },
      down: { x: 0, y: panAmount },
      left: { x: -panAmount, y: 0 },
      right: { x: panAmount, y: 0 },
    }[payload.direction];
    
    // Update viewport position in state
    // (reducer handles the actual state update)
    
    dispatch(viewportPanned({ 
      direction: payload.direction,
      newPosition: {
        x: state.viewport.position.x + delta.x,
        y: state.viewport.position.y + delta.y
      }
    }));
  }
});

// Handle add keyframe triggered by Q shortcut
middlewares.startListening({
  actionCreator: addKeyframe,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const { Composer: state } = getState() as { Composer: ComposerModuleState };
    
    const keyframe = {
      id: generateId(),
      time: state.timeline.currentTime,
      properties: getCurrentProperties(state)
    };
    
    dispatch(keyframeAdded({ keyframe }));
  }
});

// Handle toggle playback triggered by Space shortcut
middlewares.startListening({
  actionCreator: togglePlayback,
  effect: async (_, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const { Composer: state } = getState() as { Composer: ComposerModuleState };
    
    const newPlayingState = !state.timeline.isPlaying;
    
    if (newPlayingState) {
      // Start playback
      startAnimationLoop(dispatch, getState);
    } else {
      // Stop playback
      stopAnimationLoop();
    }
    
    dispatch(playbackToggled({ isPlaying: newPlayingState }));
  }
});

export default middlewares;
```

## Component Wrappers

### ShortcutButton Component

Automatically wraps buttons with shortcut registration and visual indicators:

```typescript
interface ShortcutButtonProps extends ButtonProps {
  shortcutKey?: string;              // The keyboard shortcut
  shortcutLabel?: string;            // Override label for display
  shortcutContext?: string;          // Override context (defaults to current)
  shortcutPriority?: number;         // Override priority
  actionType: string;                // Redux action type to dispatch
  actionPayload?: any;               // Optional payload for the action
  showShortcut?: boolean;            // Show key hint on button (default: true)
}

// Usage example:
<ShortcutButton
  shortcutKey="q"
  actionType="composer/addKeyframe"
  showShortcut={true}
>
  Add Keyframe
</ShortcutButton>
```

Implementation:

```typescript
import React from 'react';
import { Button, ButtonProps, Box } from '@mui/material';
import { useDispatch } from 'react-redux';
import { useShortcut } from '../hooks/useShortcut';
import { useShortcutContext } from '../hooks/useShortcutContext';

export const ShortcutButton: React.FC<ShortcutButtonProps> = ({
  shortcutKey,
  shortcutLabel,
  shortcutContext,
  shortcutPriority,
  actionType,
  actionPayload,
  showShortcut = true,
  children,
  onClick,
  ...buttonProps
}) => {
  const dispatch = useDispatch();
  const currentContext = useShortcutContext();
  const context = shortcutContext || currentContext;
  
  const handleAction = React.useCallback(() => {
    // Dispatch the Redux action
    dispatch({
      type: actionType,
      payload: actionPayload,
      meta: { triggeredBy: 'user-click' }
    });
  }, [dispatch, actionType, actionPayload]);
  
  // Register the shortcut
  useShortcut({
    key: shortcutKey,
    actionType,
    actionPayload,
    label: shortcutLabel || (typeof children === 'string' ? children : ''),
    context,
    priority: shortcutPriority,
    enabled: !buttonProps.disabled
  }, [actionType, actionPayload, buttonProps.disabled]);
  
  const handleClick = (e: React.MouseEvent) => {
    handleAction();
    onClick?.(e);
  };
  
  return (
    <Button
      {...buttonProps}
      onClick={handleClick}
      sx={{
        position: 'relative',
        ...buttonProps.sx
      }}
    >
      {children}
      {showShortcut && shortcutKey && (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            fontSize: '0.7rem',
            opacity: 0.7,
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '1px 4px',
            borderRadius: '3px',
            fontFamily: 'monospace'
          }}
        >
          {shortcutKey.toUpperCase()}
        </Box>
      )}
    </Button>
  );
};
```

### ShortcutProvider Component

Defines a shortcut context scope for child components:

```typescript
import React from 'react';
import { ShortcutContext } from '../contexts';

interface ShortcutProviderProps {
  context: string;          // Context name
  children: React.ReactNode;
  enabled?: boolean;        // Whether this context is active (default: true)
}

export const ShortcutProvider: React.FC<ShortcutProviderProps> = ({
  context,
  children,
  enabled = true
}) => {
  const dispatch = useDispatch();
  const parentContext = React.useContext(ShortcutContext);
  
  const fullContext = parentContext 
    ? `${parentContext}.${context}`
    : context;
  
  React.useEffect(() => {
    if (enabled) {
      // Dispatch pushContext action
      dispatch(pushContext(fullContext));
      
      return () => {
        // Dispatch popContext action on unmount
        dispatch(popContext(fullContext));
      };
    }
  }, [fullContext, enabled, dispatch]);
  
  return (
    <ShortcutContext.Provider value={fullContext}>
      {children}
    </ShortcutContext.Provider>
  );
};
```

Usage:

```typescript
// In a component
<ShortcutProvider context="Composer.Viewport">
  <ViewportComponent>
    <ShortcutProvider context="Timeline">
      <TimelineComponent>
        <ShortcutButton 
          shortcutKey="q" 
          action="timeline:add-keyframe"
        >
          Add Keyframe
        </ShortcutButton>
      </TimelineComponent>
    </ShortcutProvider>
  </ViewportComponent>
</ShortcutProvider>
```

## Hooks API

### useShortcut

Register shortcuts imperatively in functional components:

```typescript
function useShortcut(
  definition: Omit<ShortcutDefinition, 'context'> & { 
    key: string;
    actionType: string;
    context?: string;  // Optional, defaults to current context
  },
  deps?: React.DependencyList
): void;

// Example usage:
function TimelineComponent() {
  const dispatch = useDispatch();
  const [playing, setPlaying] = React.useState(false);
  
  // Register shortcut that dispatches Redux action
  useShortcut({
    key: 'Space',
    actionType: 'composer/togglePlayback',
    label: 'Play/Pause',
  }, []);
  
  // Conditionally enabled shortcut
  useShortcut({
    key: 'q',
    actionType: 'composer/addKeyframe',
    label: 'Add keyframe',
    enabled: !playing  // Only active when paused
  }, [playing]);
  
  // Shortcut with payload
  useShortcut({
    key: 'Shift+q',
    actionType: 'composer/addKeyframe',
    payload: { interpolation: 'linear' },
    label: 'Add linear keyframe',
  }, []);
  
  // Component JSX...
}
```

**Implementation:**

```typescript
// hooks/useShortcut.ts
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { registerShortcut, unregisterShortcut } from '../store/actions';
import { useShortcutContext } from './useShortcutContext';

export function useShortcut(
  definition: Omit<ShortcutDefinition, 'context'> & {
    context?: string;
  },
  deps: React.DependencyList = []
) {
  const dispatch = useDispatch();
  const currentContext = useShortcutContext();
  const context = definition.context || currentContext;
  
  useEffect(() => {
    const fullDefinition = {
      ...definition,
      context,
    };
    
    // Register shortcut via Redux action
    dispatch(registerShortcut(fullDefinition));
    
    // Cleanup: unregister on unmount
    return () => {
      dispatch(unregisterShortcut({
        context,
        key: definition.key
      }));
    };
  }, [context, ...deps]);
}
```

### useShortcutContext

Get or manage the current shortcut context:

```typescript
function useShortcutContext(): string;

// Example:
function MyComponent() {
  const context = useShortcutContext();
  console.log('Current context:', context);
  // Output: "Composer.Viewport.Timeline"
}
```

### useActiveShortcuts

Query currently active shortcuts for display:

```typescript
function useActiveShortcuts(options?: {
  context?: string;      // Filter by context
  category?: string;     // Filter by category
}): ShortcutDefinition[];

// Example - show shortcuts in help overlay:
function ShortcutHelp() {
  const activeShortcuts = useActiveShortcuts();
  
  return (
    <List>
      {activeShortcuts.map(shortcut => (
        <ListItem key={`${shortcut.context}-${shortcut.key}`}>
          <Kbd>{shortcut.key}</Kbd>
          <span>{shortcut.label}</span>
        </ListItem>
      ))}
    </List>
  );
}
```

## Implementation Details

### KeyboardListener Component

The global listener dispatches Redux actions when keys are pressed:

```typescript
// components/KeyboardListener.tsx
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { keyPressed } from '../store/actions';
import { formatKeyEvent } from '../utils/formatKeyEvent';

/**
 * Global keyboard event listener component
 * Should be mounted once at the app root level
 */
export const KeyboardListener: React.FC = () => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      
      // Normalize key event to string format
      const key = formatKeyEvent(event);
      
      // Dispatch keyPressed command action
      // Middleware will handle the rest
      dispatch(keyPressed({
        key,
        originalEvent: event,
        timestamp: Date.now()
      }));
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch]);
  
  // This component renders nothing
  return null;
};
```

**Integration in App:**

```typescript
// In kernel/App.tsx
import { KeyboardListener } from './modules/KeyboardShortcuts/components/KeyboardListener';

const App = (): React.ReactElement => {
  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <DynamicStore>
        <ModulesProvider>
          <KeyboardListener />  {/* Add global listener */}
          <Layout />
        </ModulesProvider>
      </DynamicStore>
    </ErrorBoundary>
  );
};
```

### ShortcutManager (Optional Facade)

The manager provides a functional API facade over Redux actions:

```typescript
// managers/useShortcutManager.ts
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import {
  registerShortcut,
  unregisterShortcut,
  pushContext,
  popContext,
  setShortcutEnabled,
} from '../store/actions';
import {
  selectAllShortcuts,
  selectContextStack,
  selectShortcutsByContext,
} from '../store/selectors';
import { Manager } from '@kernel/modules/base';

export interface ShortcutManagerFunctions {
  register(definition: ShortcutDefinition): () => void;
  unregister(context: string, key: string): void;
  pushContext(context: string): void;
  popContext(context: string): void;
  getContextStack(): string[];
  getShortcutsForContext(context: string): ShortcutDefinition[];
  getAllShortcuts(): Record<string, Record<string, ShortcutDefinition>>;
  setEnabled(context: string, key: string, enabled: boolean): void;
}

export function useShortcutManager(): Manager {
  const dispatch = useDispatch();
  const allShortcuts = useSelector(selectAllShortcuts);
  const contextStack = useSelector(selectContextStack);
  
  const register = useCallback((definition: ShortcutDefinition) => {
    dispatch(registerShortcut(definition));
    
    // Return cleanup function
    return () => {
      dispatch(unregisterShortcut({
        context: definition.context,
        key: definition.key
      }));
    };
  }, [dispatch]);
  
  const unregister = useCallback((context: string, key: string) => {
    dispatch(unregisterShortcut({ context, key }));
  }, [dispatch]);
  
  const pushContextFn = useCallback((context: string) => {
    dispatch(pushContext(context));
  }, [dispatch]);
  
  const popContextFn = useCallback((context: string) => {
    dispatch(popContext(context));
  }, [dispatch]);
  
  const getContextStack = useCallback(() => {
    return contextStack;
  }, [contextStack]);
  
  const getShortcutsForContext = useCallback((context: string) => {
    return allShortcuts[context] || {};
  }, [allShortcuts]);
  
  const getAllShortcuts = useCallback(() => {
    return allShortcuts;
  }, [allShortcuts]);
  
  const setEnabled = useCallback((context: string, key: string, enabled: boolean) => {
    dispatch(setShortcutEnabled({ context, key, enabled }));
  }, [dispatch]);
  
  return {
    functions: {
      register,
      unregister,
      pushContext: pushContextFn,
      popContext: popContextFn,
      getContextStack,
      getShortcutsForContext,
      getAllShortcuts,
      setEnabled,
    }
  };
}
```

### Key Event Formatting Utility

Normalize keyboard events into consistent key strings:

```typescript
// utils/formatKeyEvent.ts
export function formatKeyEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  
  // Add modifiers in consistent order
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  
  // Normalize key
  let key = event.key;
  if (key === ' ') {
    key = 'Space';
  } else if (key.length === 1) {
    key = key.toLowerCase();
  }
  
  parts.push(key);
  
  return parts.join('+');
}

// Examples:
// Ctrl + S → 'Ctrl+s'
// W → 'w'
// Shift + Alt + Q → 'Shift+Alt+q'
// Space → 'Space'
```

## Visual Feedback

### ShortcutOverlay Component

Displays active shortcuts as an overlay (like AoE4's command panel):

```typescript
export const ShortcutOverlay: React.FC<{
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  visible?: boolean;
}> = ({ position = 'bottom-right', visible = true }) => {
  const activeShortcuts = useActiveShortcuts();
  const currentContext = useShortcutContext();
  
  if (!visible || activeShortcuts.length === 0) return null;
  
  // Group by category
  const grouped = groupBy(activeShortcuts, s => s.metadata?.category || 'General');
  
  return (
    <Paper
      sx={{
        position: 'fixed',
        [position.split('-')[0]]: 20,
        [position.split('-')[1]]: 20,
        padding: 2,
        maxWidth: 300,
        zIndex: 1000
      }}
    >
      <Typography variant="h6" gutterBottom>
        Active Shortcuts
      </Typography>
      {Object.entries(grouped).map(([category, shortcuts]) => (
        <Box key={category} mb={2}>
          <Typography variant="subtitle2" color="textSecondary">
            {category}
          </Typography>
          <Stack spacing={0.5}>
            {shortcuts.map(shortcut => (
              <Box
                key={shortcut.key}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Typography variant="body2">{shortcut.label}</Typography>
                <Kbd>{shortcut.key}</Kbd>
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Paper>
  );
};
```

## Advanced Features

### Customizable Shortcuts

Allow users to change key bindings:

```typescript
// In user settings
function ShortcutCustomizer() {
  const allShortcuts = useActiveShortcuts();
  const shortcutManager = useModule<KeyboardShortcuts>('KeyboardShortcuts')
    .managers.shortcutManager();
  
  const handleCustomize = (actionId: string, newKey: string) => {
    shortcutManager.functions.customize(actionId, newKey);
  };
  
  return (
    <List>
      {allShortcuts
        .filter(s => s.metadata?.customizable)
        .map(shortcut => (
          <ListItem key={`${shortcut.context}-${shortcut.key}`}>
            <ListItemText primary={shortcut.label} />
            <KeyInput
              value={shortcut.key}
              onChange={newKey => handleCustomize(shortcut.action, newKey)}
            />
          </ListItem>
        ))}
    </List>
  );
}
```

### Shortcut Conflicts Detection

Display conflicts to developers:

```typescript
function detectConflicts(shortcuts: ShortcutDefinition[]): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // Group by context
  const byContext = groupBy(shortcuts, s => s.context);
  
  Object.entries(byContext).forEach(([context, contextShortcuts]) => {
    // Group by key within context
    const byKey = groupBy(contextShortcuts, s => s.key);
    
    Object.entries(byKey).forEach(([key, keyShortcuts]) => {
      if (keyShortcuts.length > 1) {
        conflicts.push({
          context,
          key,
          shortcuts: keyShortcuts
        });
      }
    });
  });
  
  return conflicts;
}
```

## Performance Considerations

### Optimization Strategies

**1. Use Memoized Selectors**

```typescript
// Selectors are already memoized with createSelector
const activeShortcuts = useSelector(selectActiveShortcuts);
// Only recomputes when shortcuts or context stack changes
```

**2. Efficient Context Stack Lookups**

The middleware searches from most specific to least specific context, stopping at first match. This is O(n * m) where n is context stack depth (typically 3-5) and m is shortcuts per context (typically 5-10). Very fast in practice.

```typescript
// Middleware searches backward through stack
for (let i = contextStack.length - 1; i >= 0; i--) {
  // Find matching shortcuts - object property lookup is O(1)
  const shortcut = shortcuts[contextStack[i]][key];
  if (shortcut && shortcut.enabled !== false) {
    // Dispatch and stop - no need to continue
    dispatch(shortcut.actionType);
    return;
  }
}
```

**3. Avoid Unnecessary Re-registrations**

```typescript
// ✅ Good - stable dependencies
useShortcut({
  key: 'q',
  actionType: addKeyframe.type,
  label: 'Add keyframe'
}, []); // Empty deps - registers once

// ❌ Bad - re-registers on every render
useShortcut({
  key: 'q',
  actionType: addKeyframe.type,
  label: 'Add keyframe'
}); // No deps array
```

**4. Debounce Rapid Key Presses (if needed)**

For actions that are expensive, the module middleware can debounce:

```typescript
let debounceTimer: number | null = null;

middlewares.startListening({
  actionCreator: expensiveAction,
  effect: async (action, listenerApi) => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Debounce if triggered by keyboard
    if (action.meta?.triggeredBy === 'keyboard-shortcut') {
      debounceTimer = window.setTimeout(() => {
        // Perform expensive operation
        performExpensiveWork();
        dispatch(operationCompleted());
      }, 100);
    } else {
      // UI clicks are not debounced
      performExpensiveWork();
      dispatch(operationCompleted());
    }
  }
});
```

**5. Redux DevTools in Production**

Disable Redux DevTools in production builds to avoid the overhead of serializing every action:

```typescript
const store = configureStore({
  // ...
  devTools: process.env.NODE_ENV !== 'production'
});
```

### Benchmarks

Expected performance characteristics:

- **Key press to action dispatch**: < 1ms
- **Context stack search**: < 0.1ms (for typical 3-5 contexts)
- **Shortcut registration**: < 0.5ms per shortcut
- **Re-render on context change**: Only affected components (React's normal behavior)

### Memory Usage

- Each shortcut: ~200 bytes (object with strings and function reference)
- 100 shortcuts: ~20 KB
- Context stack: < 1 KB
- Total overhead: < 50 KB for typical application

## Migration Path

### Phase 1: Core Infrastructure
1. Create KeyboardShortcuts kernel module
2. Implement ShortcutManager
3. Add IModule.shortcuts field
4. Set up global keyboard listener

### Phase 2: Component Wrappers
1. Create ShortcutButton component
2. Create ShortcutProvider component
3. Implement hooks (useShortcut, useShortcutContext)

### Phase 3: Module Integration
1. Add shortcuts to existing modules (Composer, Materials, etc.)
2. Replace existing keyboard handling with new system
3. Add visual feedback components

### Phase 4: Advanced Features
1. Implement customization UI
2. Add persistence for user customizations
3. Create conflict detection tools
4. Add help/documentation overlay

## Best Practices

1. **Context Naming**: Use dot notation and follow module structure
   - ✅ `Composer.Viewport.Timeline`
   - ❌ `composer_viewport_timeline`

2. **Action Naming Convention**: Follow project's `[ModuleName:Command/Event]` pattern
   ```typescript
   // Import constants
   import { ACTION_TYPES } from '@kernel/constants';
   import { MODULE_NAME } from '../constants';
   
   // ✅ Commands (imperative, Title Case)
   createAction(`[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save composition`)
   // Result: "[Composer:Command] Save composition"
   
   createAction(`[${MODULE_NAME}:Timeline:${ACTION_TYPES.COMMAND}] Add keyframe`)
   // Result: "[Composer:Timeline:Command] Add keyframe"
   
   // ✅ Events (past tense, lowercase after bracket)
   createAction(`[${MODULE_NAME}:${ACTION_TYPES.EVENT}] composition saved`)
   // Result: "[Composer:Event] composition saved"
   
   createAction(`[${MODULE_NAME}:Timeline:${ACTION_TYPES.EVENT}] keyframe added`)
   // Result: "[Composer:Timeline:Event] keyframe added"
   
   // ❌ Bad - doesn't follow convention
   createAction('composer/save')
   createAction('SAVE_COMPOSITION')
   createAction('composer:save')
   ```

3. **Action Type Usage**: Reference actions by their `.type` property
   ```typescript
   shortcuts: [{
     key: 'Ctrl+s',
     actionType: saveComposition.type,  // ✅ Use .type property
     label: 'Save'
   }]
   
   // When checking in middleware
   if (action.type === saveComposition.type) { ... }  // ✅
   ```

4. **Key Selection**: Follow conventions
   - Single letters for quick actions (q, w, e, r)
   - Ctrl/Cmd for global actions (Ctrl+s, Ctrl+z)
   - Shift for variations (Shift+q for opposite action)
   - Avoid overriding browser shortcuts (Ctrl+t, Ctrl+w, etc.)

5. **Priority**: Reserve high priorities (>100) for critical actions
   - Global actions: 100+
   - Module actions: 50-99
   - Component actions: 0-49

6. **Redux Actions**: Always dispatch actions, never call functions directly
   ```typescript
   // ✅ Good - dispatches Redux action
   useShortcut({
     key: 'q',
     actionType: addKeyframe.type,
     label: 'Add keyframe'
   });
   
   // ❌ Bad - direct function call, bypasses Redux
   useShortcut({
     key: 'q',
     action: () => addKeyframeDirectly(),
     label: 'Add keyframe'
   });
   ```

6. **Redux Actions**: Always dispatch actions, never call functions directly
   ```typescript
   // ✅ Good - dispatches Redux action
   useShortcut({
     key: 'q',
     actionType: addKeyframe.type,
     label: 'Add keyframe'
   });
   
   // ❌ Bad - direct function call, bypasses Redux
   useShortcut({
     key: 'q',
     action: () => addKeyframeDirectly(),
     label: 'Add keyframe'
   });
   ```

7. **Cleanup**: Hooks handle cleanup automatically via Redux
   ```typescript
   // useShortcut automatically unregisters on unmount
   useShortcut({
     key: 'Space',
     actionType: togglePlayback.type,
     label: 'Play/Pause'
   }, []);
   ```

8. **Testing**: Test shortcuts through Redux action dispatching
   ```typescript
   import { fireEvent, screen } from '@testing-library/react';
   import { keyPressed } from '@kernel/modules/KeyboardShortcuts/store/actions';
   import { addKeyframe } from '../store/actions';
   
   test('pressing Q dispatches addKeyframe action', () => {
     const { store } = renderWithProviders(<TimelineComponent />);
     
     // Simulate key press
     fireEvent.keyDown(document, { key: 'q' });
     
     // Verify keyPressed action was dispatched
     const actions = store.getActions();
     expect(actions).toContainEqual(
       expect.objectContaining({
         type: keyPressed.type  // "[KeyboardShortcuts:Command] Key pressed"
       })
     );
     
     // Verify target action was dispatched by middleware
     expect(actions).toContainEqual(
       expect.objectContaining({
         type: addKeyframe.type,  // "[Composer:Timeline:Command] Add keyframe"
         meta: expect.objectContaining({
           triggeredBy: 'keyboard-shortcut',
           key: 'q'
         })
       })
     );
   });
   
   test('middleware handles addKeyframe action correctly', () => {
     const { store } = renderWithProviders(<TimelineComponent />);
     
     // Directly dispatch the action (testing middleware logic)
     store.dispatch(addKeyframe());
     
     // Verify state was updated
     const state = store.getState();
     expect(state.Composer.timeline.keyframes).toHaveLength(1);
   });
   ```

9. **Middleware Pattern**: Handle shortcut-triggered actions in middlewares
   ```typescript
   middlewares.startListening({
     actionCreator: addKeyframe,
     effect: async (action, listenerApi) => {
       // Check if triggered by shortcut
       if (action.meta?.triggeredBy === 'keyboard-shortcut') {
         console.log(`Triggered by key: ${action.meta.key}`);
       }
       
       // Handle the action
       // ...
       // ...
     }
   });
   ```

## Example: Full Module Integration

```typescript
// src/system/modules/Composer/index.ts
import { IModule } from '@kernel/modules/base';
import {
  saveComposition,
  undo,
  redo,
  panViewport,
  zoomIn,
  zoomOut,
} from './store/actions';
import composerMiddlewares from './store/middlewares';
import composerReducer from './store/slice';

const ComposerModule: IModule = {
  name: 'Composer',
  version: '1.0.0',
  depends_on: ['Layout', 'KeyboardShortcuts'],
  
  shortcuts: {
    'Composer': {
      label: 'Composer',
      shortcuts: [
        { 
          key: 'Ctrl+s',
          actionType: saveComposition.type,
          label: 'Save composition' 
        },
        {
          key: 'Ctrl+z',
          actionType: undo.type,
          label: 'Undo'
        },
        {
          key: 'Ctrl+y',
          actionType: redo.type,
          label: 'Redo'
        },
      ]
    },
    'Composer.Viewport': {
      label: 'Viewport',
      shortcuts: [
        {
          key: 'w',
          actionType: panViewport.type,
          payload: { direction: 'up' },
          label: 'Pan up'
        },
        {
          key: 'a',
          actionType: panViewport.type,
          payload: { direction: 'left' },
          label: 'Pan left'
        },
        {
          key: 's',
          actionType: panViewport.type,
          payload: { direction: 'down' },
          label: 'Pan down'
        },
        {
          key: 'd',
          actionType: panViewport.type,
          payload: { direction: 'right' },
          label: 'Pan right'
        },
        {
          key: '+',
          actionType: zoomIn.type,
          label: 'Zoom in'
        },
        {
          key: '-',
          actionType: zoomOut.type,
          label: 'Zoom out'
        },
      ]
    }
  },
  
  store: {
    actions: {
      commands: {
        saveComposition,
        undo,
        redo,
        panViewport,
        zoomIn,
        zoomOut,
      },
      events: {
        // ... event actions
      }
    },
    middlewares: [composerMiddlewares],
    reducers: { composer: composerReducer }
  },
  
  kernelCalls: {
    startModule,
    restartModule() {},
    shutdownModule() {}
  }
};

export default ComposerModule;

// src/system/modules/Composer/components/Viewport.tsx
import { ShortcutProvider } from '@kernel/modules/KeyboardShortcuts/components/ShortcutProvider';
import { ShortcutButton } from '@kernel/modules/KeyboardShortcuts/components/ShortcutButton';
import { zoomIn, zoomOut } from '../store/actions';

function Viewport() {
  return (
    <ShortcutProvider context="Viewport">
      <Box>
        <ShortcutButton 
          shortcutKey="+" 
          actionType={zoomIn.type}
          icon={<ZoomInIcon />}
        >
          Zoom In
        </ShortcutButton>
        
        <ShortcutButton 
          shortcutKey="-" 
          actionType={zoomOut.type}
          icon={<ZoomOutIcon />}
        >
          Zoom Out
        </ShortcutButton>
        
        {/* Viewport content */}
      </Box>
    </ShortcutProvider>
  );
}
```

## KeyboardShortcuts Module Definition

The complete module definition for KeyboardShortcuts:

```typescript
// src/kernel/modules/KeyboardShortcuts/index.ts
import { IModule } from '../base';
import { MODULE_NAME, MODULE_VERSION } from './constants';
import { start } from './kernelCalls/startModule';
import { useShortcutManager } from './managers/useShortcutManager';
import middlewares from './store/middlewares';
import keyboardShortcutsReducer from './store/slice';
import * as actions from './store/actions';
import * as selectors from './store/selectors';
import { KeyboardListener } from './components/KeyboardListener';
import { ShortcutButton } from './components/ShortcutButton';
import { ShortcutProvider } from './components/ShortcutProvider';
import { ShortcutOverlay } from './components/ShortcutOverlay';

export interface IKeyboardShortcuts extends IModule {
  name: typeof MODULE_NAME;
  version: typeof MODULE_VERSION;
  managers: {
    shortcutManager: typeof useShortcutManager;
  };
}

const module: IKeyboardShortcuts = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: ['Store', 'Loader'],
  
  components: {
    KeyboardListener,
    ShortcutButton,
    ShortcutProvider,
    ShortcutOverlay,
  },
  
  store: {
    actions: {
      commands: {
        keyPressed: actions.keyPressed,
        registerShortcut: actions.registerShortcut,
        unregisterShortcut: actions.unregisterShortcut,
        pushContext: actions.pushContext,
        popContext: actions.popContext,
        setShortcutEnabled: actions.setShortcutEnabled,
        customizeShortcut: actions.customizeShortcut,
        saveSession: actions.saveSession,
      },
      events: {
        shortcutRegistered: actions.shortcutRegistered,
        shortcutUnregistered: actions.shortcutUnregistered,
        shortcutExecuted: actions.shortcutExecuted,
        shortcutConflictDetected: actions.shortcutConflictDetected,
        contextPushed: actions.contextPushed,
        contextPopped: actions.contextPopped,
        sessionSaved: actions.sessionSaved,
      }
    },
    middlewares: [middlewares],
    selectors,
    reducers: {
      KeyboardShortcuts: keyboardShortcutsReducer
    }
  },
  
  managers: {
    shortcutManager: useShortcutManager
  },
  
  kernelCalls: {
    startModule: start,
    restartModule() {},
    shutdownModule() {}
  }
};

export default module;
```

## Conclusion

This keyboard shortcut system provides:

- **Redux-First Architecture**: All state and side effects flow through Redux and middlewares
- **Context-Sensitive**: Key bindings change based on active contexts, like AoE4's command panel
- **Command/Event Pattern**: Follows the project's established action pattern (commands trigger middlewares, middlewares dispatch events)
- **Listener Middleware**: Uses Redux Toolkit's `createListenerMiddleware()` for clean async logic
- **Modular Registration**: Modules define shortcuts in their `IModule.shortcuts` field at startup
- **Component Wrappers**: Declarative `<ShortcutButton>` and `<ShortcutProvider>` components
- **Visual Feedback**: Key hints on buttons and optional overlay for discoverability
- **Flexible Priority**: Context hierarchy and explicit priorities resolve conflicts
- **User Customization**: Supports remapping keys with persistence
- **Testable**: Redux architecture makes shortcuts easy to unit test

The system integrates seamlessly with the existing micro-kernel architecture and follows established patterns from the Loader, Store, and Layout modules.
