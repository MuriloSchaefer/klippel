# KeyboardShortcuts Module

A context-sensitive keyboard shortcut system inspired by Age of Empires 4, designed for the Klippel micro-kernel architecture.

## Overview

The KeyboardShortcuts module provides a Redux-first, context-aware keyboard shortcut system that allows different modules to register the same keys for different actions. The active context determines which action executes, similar to how Age of Empires 4's command panel works.

**Key Features:**
- Context-sensitive shortcuts (e.g., 'Q' in Timeline vs 'Q' in Composer)
- Redux-first architecture with listener middlewares
- Declarative and imperative APIs
- Visual feedback components
- User customization support
- Conflict detection and resolution

## Architecture

See [architecture.md](./architecture.md) for visual diagrams (Mermaid/BPMN format) showing:
1. **Initialization Flow (BPMN)** - Step-by-step module startup and registration process
2. **Module Consumption Flow** - How other modules consume KeyboardShortcuts
3. **Context Stack Management** - State transitions and context hierarchy
4. **Runtime Event Flow** - Sequence diagram for keyboard event processing
5. **API Structure** - Component and class diagrams

### Core Principles

1. **Redux-First**: All shortcuts dispatch Redux actions. No direct function calls.
2. **Middleware-Driven**: KeyboardShortcuts middleware intercepts key presses and dispatches module actions.
3. **Context Hierarchy**: Shortcuts are organized by context (Global → Module → Component).
4. **Action Naming**: Follows project conventions: `[ModuleName:Command/Event] Description`.

## Quick Start

### For Module Authors

**1. Define actions:**

```typescript
// store/actions.ts
import { ACTION_TYPES } from '@kernel/constants';
import { createAction } from '@reduxjs/toolkit';
import { MODULE_NAME } from '../constants';

export const saveComposition = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save composition`
);

export const addKeyframe = createAction(
  `[${MODULE_NAME}:Timeline:${ACTION_TYPES.COMMAND}] Add keyframe`
);
```

**2. Register shortcuts in your module:**

```typescript
// index.ts
const MyModule: IModule = {
  name: 'MyModule',
  depends_on: ['KeyboardShortcuts'],
  
  shortcuts: {
    'MyModule': {
      label: 'My Module Actions',
      shortcuts: [
        {
          key: 'Ctrl+s',
          actionType: saveComposition.type,
          label: 'Save'
        }
      ]
    }
  }
};
```

**3. Handle actions in middleware:**

```typescript
// store/middlewares.ts
middlewares.startListening({
  actionCreator: saveComposition,
  effect: async (action, listenerApi) => {
    // action.meta.triggeredBy === 'keyboard-shortcut' when from shortcut
    // Perform your business logic
    dispatch(compositionSaved({ timestamp: Date.now() }));
  }
});
```

**4. Use in components:**

```typescript
// Declarative
<ShortcutButton shortcutKey="q" actionType={addKeyframe.type}>
  Add Keyframe
</ShortcutButton>

// Imperative
useShortcut({
  key: 'Space',
  actionType: togglePlayback.type,
  label: 'Play/Pause'
}, []);
```

## Folder Structure

```
KeyboardShortcuts/
├── constants.ts              # Module constants (MODULE_NAME, etc.)
├── architecture.md           # Visual diagrams (Mermaid/BPMN format)
├── DESIGN.md                 # Original comprehensive design document
├── README.md                 # This file
├── components/
│   └── design.md            # Component design patterns
│       - KeyboardListener (global event
 listener)
│       - ShortcutButton (button with shortcut)
│       - ShortcutProvider (context provider)
│       - ShortcutOverlay (AoE4-style overlay)
├── contexts/
│   └── design.md            # React Context design
│       - ShortcutContext (current context tracking)
├── hooks/
│   └── design.md            # Hook API design
│       - useShortcut (imperative registration)
│       - useShortcutContext (get current context)
│       - useActiveShortcuts (query shortcuts)
├── kernelCalls/
│   └── design.md            # Lifecycle functions design
│       - startModule (initialization & registration)
│       - restartModule (restart logic)
│       - shutdownModule (cleanup)
├── managers/
│   └── design.md            # Manager design
│       - useShortcutManager (functional API facade)
├── store/
│   └── design.md            # Redux store design
│       - state.ts (state shape)
│       - actions.ts (commands & events)
│       - slice.ts (reducers)
│       - middlewares.ts (core dispatcher)
│       - selectors.ts (memoized queries)
└── utils/
    └── design.md            # Utility functions design
        - formatKeyEvent (normalize keyboard events)
```

## Data Flow

```
User presses key
    ↓
KeyboardListener dispatches keyPressed action
    ↓
KeyboardShortcuts middleware intercepts
    ↓
Search context stack (most specific → general)
    ↓
Find matching shortcut
    ↓
Dispatch target module action with meta.triggeredBy
    ↓
Module middleware handles action
    ↓
Module dispatches event action
    ↓
Reducer updates state
    ↓
UI re-renders
```

## Context Hierarchy

Contexts build a hierarchy:

```
Global (always active)
  └─ Composer (module context)
      └─ Composer.Viewport (component context)
          └─ Composer.Viewport.Timeline (sub-component)
```

Resolution order (most specific first):
1. `Composer.Viewport.Timeline`
2. `Composer.Viewport`
3. `Composer`
4. `Global`

## Module Registration

Modules declare shortcuts in their `IModule` definition:

```typescript
const ComposerModule: IModule = {
  name: 'Composer',
  depends_on: ['KeyboardShortcuts'],
  
  shortcuts: {
    'Composer': {
      label: 'Composer Actions',
      shortcuts: [
        { key: 'Ctrl+s', actionType: saveComposition.type, label: 'Save' },
        { key: 'Ctrl+z', actionType: undo.type, label: 'Undo' }
      ]
    },
    'Composer.Viewport': {
      label: 'Viewport Navigation',
      shortcuts: [
        { key: 'w', actionType: panViewport.type, payload: { direction: 'up' }, label: 'Pan up' },
        { key: 'a', actionType: panViewport.type, payload: { direction: 'left' }, label: 'Pan left' }
      ]
    }
  }
};
```

During `KeyboardShortcuts.startModule()`:
1. Gets all loaded modules from ModulesManager
2. For each module with `shortcuts` field:
   - Extract contexts and shortcut groups
   - Dispatch `registerShortcut()` for each shortcut
3. Middleware handles registration and conflict detection
4. Reducer updates state

## APIs

### Components

- **KeyboardListener** - Global keyboard event listener (mount once at app root)
- **ShortcutButton** - Button with integrated shortcut registration and visual hint
- **ShortcutProvider** - Establish shortcut context scope
- **ShortcutOverlay** - Display active shortcuts overlay

### Hooks

- **useShortcut** - Register shortcuts imperatively
- **useShortcutContext** - Get current context
- **useActiveShortcuts** - Query active shortcuts for display

### Manager

- **useShortcutManager** - Functional API for programmatic access

### Redux Actions

**Commands** (imperative, Title Case):
- `keyPressed` - Keyboard event occurred
- `registerShortcut` - Register new shortcut
- `unregisterShortcut` - Remove shortcut
- `pushContext` - Add context to stack
- `popContext` - Remove context from stack
- `setShortcutEnabled` - Enable/disable shortcut
- `customizeShortcut` - Remap shortcut key
- `saveSession` - Persist customizations

**Events** (past-tense, lowercase):
- `shortcutRegistered` - Shortcut was registered
- `shortcutUnregistered` - Shortcut was removed
- `shortcutExecuted` - Shortcut was triggered
- `shortcutConflictDetected` - Conflict detected
- `contextPushed` - Context added
- `contextPopped` - Context removed
- `sessionSaved` - Session persisted

## Best Practices

### Action Naming Convention

Follow the project's standardized format:

```typescript
// Commands: [ModuleName:Category:Command] Title Case
`[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save composition`
`[${MODULE_NAME}:Timeline:${ACTION_TYPES.COMMAND}] Add keyframe`

// Events: [ModuleName:Category:Event] lowercase
`[${MODULE_NAME}:${ACTION_TYPES.EVENT}] composition saved`
`[${MODULE_NAME}:Timeline:${ACTION_TYPES.EVENT}] keyframe added`
```

### Component Design

1. Keep components presentational (no business logic)
2. Use hooks for coordination (useShortcut, useShortcutContext)
3. Never pass hooks as props
4. Minimize component state, derive from props/selectors
5. Use useMemo for computed values

### Shortcut Registration

1. Register at component level (use useShortcut where the action belongs)
2. Enable/disable dynamically based on state
3. Provide payloads in shortcut definition
4. Use action.type from action creators for consistency

### Context Management

1. Declarative with ShortcutProvider (preferred for components)
2. Imperative with manager (for dynamic contexts like modals)
3. Always cleanup (pop context when unmounting)
4. Follow naming convention: `Module.Component.SubComponent`

## Dependencies

- **Store** - Redux store and managers
- **Loader** - Module loading system

Modules wanting to register shortcuts should depend on **KeyboardShortcuts**:

```typescript
depends_on: ['KeyboardShortcuts', 'Store', ...]
```

## Testing

Test shortcuts at multiple levels:

**Unit Tests** - Test utilities and selectors:
```typescript
describe('formatKeyEvent', () => {
  it('normalizes Ctrl+key', () => {
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    expect(formatKeyEvent(event)).toBe('Ctrl+s');
  });
});
```

**Integration Tests** - Test registration and middleware:
```typescript
describe('KeyboardShortcuts middleware', () => {
  it('dispatches target action on key press', () => {
    // Setup: register shortcut
    store.dispatch(registerShortcut({
      key: 'Ctrl+s',
      actionType: 'test/save',
      context: 'Test'
    }));
    
    // Action: press key
    store.dispatch(keyPressed({ key: 'Ctrl+s', ... }));
    
    // Assert: target action dispatched
    expect(store.getActions()).toContainEqual(
      expect.objectContaining({ type: 'test/save' })
    );
  });
});
```

**Component Tests** - Test hooks and components:
```typescript
describe('useShortcut', () => {
  it('registers shortcut on mount', () => {
    const { unmount } = render(<TestComponent />);
    
    const state = store.getState();
    expect(state.KeyboardShortcuts.shortcuts['TestContext']['q']).toBeDefined();
    
    unmount();
    
    const newState = store.getState();
    expect(newState.KeyboardShortcuts.shortcuts['TestContext']['q']).toBeUndefined();
  });
});
```

## Performance Considerations

1. **Memoized Selectors** - Use `createSelector` for derived state
2. **Efficient Matching** - Context stack searched from most specific to general
3. **Stable References** - Use useCallback/useMemo for payloads to avoid re-registration
4. **Priority System** - Higher priority shortcuts win conflicts
5. **Conditional Registration** - Only register shortcuts when component is active

## Examples

See individual `design.md` files in subfolders for detailed examples:

- [Components](./components/design.md) - Component usage examples
- [Hooks](./hooks/design.md) - Hook usage patterns
- [Store](./store/design.md) - Redux patterns and data flow
- [Managers](./managers/design.md) - Manager API usage
- [KernelCalls](./kernelCalls/design.md) - Module lifecycle and initialization

## Visual Diagrams

Open [architecture.md](./architecture.md) to view standard diagrams (Mermaid/BPMN format):

1. **Initialization Flow (BPMN)** - Process flow with decision gates
   - App startup and module loading
   - `startModule()` execution
   - Middleware validation and conflict detection

2. **Module Consumption Flow** - Data flow diagram
   - Module registration via `IModule.shortcuts`
   - Runtime API usage via hooks/manager
   - Action dispatch flow

3. **Context Stack Management** - State diagram
   - Context push/pop transitions
   - State inheritance rules

4. **Runtime Event Flow** - Sequence diagram
   - Key capture and normalization
   - Middleware processing
   - Action dispatch

5. **API Structure** - Class and component diagrams
   - Module interfaces
   - Hook and manager relationships
   - Shortcut processing and registration
   - Middleware and reducer updates

## Contributing

When adding new features to KeyboardShortcuts:

1. Update the appropriate `design.md` file in the relevant subfolder
2. Follow the Redux-first architecture (no direct function calls)
3. Use the project's action naming convention
4. Add tests for new functionality
5. Update this README if adding new public APIs

## References

- [DESIGN.md](./DESIGN.md) - Original comprehensive design document with full specifications
- [architecture.md](./architecture.md) - Visual architecture diagrams (Mermaid/BPMN format)
- [Project conventions](./.github/copilot-instructions.md) - Overall project guidelines
