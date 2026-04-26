# Contexts Design

This folder contains React Context definitions for the KeyboardShortcuts module.

## Overview

Contexts provide:
- Shortcut context scope tracking
- Context hierarchy management
- React Context API integration

## Files

- `ShortcutContext.ts` - Context for tracking current shortcut scope

## ShortcutContext

The context tracks the current shortcut scope in the component tree:

```typescript
// contexts/ShortcutContext.ts
import React from 'react';

export const ShortcutContext = React.createContext<string>('Global');

export default ShortcutContext;
```

## Usage

### Provider

The `ShortcutProvider` component uses this context:

```typescript
import { ShortcutContext } from '../contexts';

export const ShortcutProvider: React.FC<ShortcutProviderProps> = ({
  context,
  children,
  enabled = true
}) => {
  const dispatch = useDispatch();
  const parentContext = React.useContext(ShortcutContext);
  
  // Build hierarchical context name
  const fullContext = parentContext 
    ? `${parentContext}.${context}`
    : context;
  
  React.useEffect(() => {
    if (enabled) {
      dispatch(pushContext(fullContext));
      
      return () => {
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

### Consumer

Access current context in any component:

```typescript
import { ShortcutContext } from '../contexts';

function MyComponent() {
  const context = React.useContext(ShortcutContext);
  
  console.log('Current context:', context);
  // Output: "Composer.Viewport.Timeline"
}
```

Or use the hook:

```typescript
import { useShortcutContext } from '../hooks/useShortcutContext';

function MyComponent() {
  const context = useShortcutContext();
  
  console.log('Current context:', context);
}
```

## Context Hierarchy

Contexts build a hierarchy as you nest `ShortcutProvider` components:

```typescript
<ShortcutProvider context="Composer">
  {/* Context: "Composer" */}
  
  <ShortcutProvider context="Viewport">
    {/* Context: "Composer.Viewport" */}
    
    <ShortcutProvider context="Timeline">
      {/* Context: "Composer.Viewport.Timeline" */}
      
      <button>Add Keyframe (Q)</button>
    </ShortcutProvider>
  </ShortcutProvider>
</ShortcutProvider>
```

The hierarchy affects shortcut resolution:
1. Most specific context is checked first (`Composer.Viewport.Timeline`)
2. Then parent contexts (`Composer.Viewport`, `Composer`)
3. Finally `Global` context

## Component Tree Example

```
App
├─ Global Context (always active)
├─ KeyboardListener
└─ Layout
    └─ ShortcutProvider context="Composer"
        ├─ Composer Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y)
        └─ ShortcutProvider context="Viewport"
            ├─ Viewport Shortcuts (WASD for panning)
            └─ ShortcutProvider context="Timeline"
                ├─ Timeline Shortcuts (Q, E, Space)
                └─ TimelineComponent
```

## Redux State vs React Context

| Aspect | Redux State | React Context |
|--------|-------------|---------------|
| **Context Stack** | Stored in Redux | - |
| **Active Context** | Derived from stack | Provided via Context |
| **Shortcuts Registry** | Stored in Redux | - |
| **Context Push/Pop** | Via Redux actions | Triggered by Provider mount/unmount |

The React Context only tracks the *current* context for the component tree. The actual context stack and shortcut resolution happens in Redux.

## Best Practices

### Using Context

1. **Declarative with Provider** - Use `ShortcutProvider` to establish context
2. **Hook for access** - Use `useShortcutContext()` hook instead of raw context
3. **Default to Global** - Context defaults to `'Global'` if not provided
4. **Nest for hierarchy** - Build context paths by nesting providers

### Context Naming

1. **Follow hierarchy** - Name contexts to reflect UI structure
2. **Module prefix** - Start with module name (e.g., `'Composer'`)
3. **Dot notation** - Use dots for nesting (e.g., `'Composer.Viewport.Timeline'`)
4. **Descriptive names** - Use clear, descriptive context names

### Performance

1. **Stable context values** - Context value is stable (string)
2. **Minimal re-renders** - Context change doesn't trigger re-renders in most components
3. **Selective consumption** - Only components using context will update

### Testing

Mock the context in tests:

```typescript
import { ShortcutContext } from '../contexts';

describe('MyComponent', () => {
  it('uses shortcut context', () => {
    render(
      <ShortcutContext.Provider value="TestContext">
        <MyComponent />
      </ShortcutContext.Provider>
    );
    
    // ... assertions
  });
});
```

## Context vs Context Stack

Don't confuse:

1. **React Context** (`ShortcutContext`)
   - Tracks current context in component tree
   - Used for component-level context resolution
   - Provides default context for `useShortcut` hook

2. **Redux Context Stack** (`state.KeyboardShortcuts.contextStack`)
   - Array of all active contexts
   - Managed via `pushContext`/`popContext` actions
   - Used by middleware to resolve shortcuts

They work together:
- Component mounts → `ShortcutProvider` pushes to Redux stack
- Component unmounts → `ShortcutProvider` pops from Redux stack  
- Component needs context → `useContext` reads React Context
- Middleware resolves shortcut → Uses Redux context stack

## Integration Example

```typescript
function TimelineComponent() {
  // Get current context from React Context
  const context = useShortcutContext();
  // → "Composer.Viewport.Timeline"
  
  // Register shortcut in current context
  useShortcut({
    key: 'q',
    actionType: addKeyframe.type,
    label: 'Add keyframe'
    // context is automatically set from useShortcutContext
  }, []);
  
  return <div>Timeline UI</div>;
}

// In parent component
<ShortcutProvider context="Timeline">
  <TimelineComponent />
</ShortcutProvider>
```

When `TimelineComponent` mounts:
1. `ShortcutProvider` pushes `"Composer.Viewport.Timeline"` to Redux stack
2. React Context value becomes `"Composer.Viewport.Timeline"`
3. `useShortcutContext` returns `"Composer.Viewport.Timeline"`
4. `useShortcut` registers with that context
5. When component unmounts, context is popped from Redux stack
