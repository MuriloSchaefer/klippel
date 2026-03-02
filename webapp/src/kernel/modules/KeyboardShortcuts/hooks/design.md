# Hooks Design

This folder contains React hooks for the KeyboardShortcuts module.

## Overview

Hooks encapsulate component-facing business logic and provide clean APIs for:
- Registering shortcuts imperatively
- Querying current context
- Accessing active shortcuts
- Managing shortcut lifecycle

## Files

- `useShortcut.ts` - Imperative shortcut registration
- `useShortcutContext.ts` - Get current context
- `useActiveShortcuts.ts` - Query active shortcuts

## useShortcut Hook

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
```

**Example usage:**

```typescript
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

## useShortcutContext Hook

Get or manage the current shortcut context:

```typescript
function useShortcutContext(): string;
```

**Example:**

```typescript
function MyComponent() {
  const context = useShortcutContext();
  console.log('Current context:', context);
  // Output: "Composer.Viewport.Timeline"
}
```

**Implementation:**

```typescript
// hooks/useShortcutContext.ts
import { useContext } from 'react';
import { ShortcutContext } from '../contexts';

export function useShortcutContext(): string {
  const context = useContext(ShortcutContext);
  return context || 'Global';
}
```

## useActiveShortcuts Hook

Query currently active shortcuts for display:

```typescript
function useActiveShortcuts(options?: {
  context?: string;      // Filter by context
  category?: string;     // Filter by category
}): ShortcutDefinition[];
```

**Example - show shortcuts in help overlay:**

```typescript
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

**Example - filter by category:**

```typescript
function FileActionsHelp() {
  const fileShortcuts = useActiveShortcuts({ category: 'File' });
  
  return (
    <Box>
      <Typography variant="h6">File Actions</Typography>
      <List>
        {fileShortcuts.map(shortcut => (
          <ListItem key={shortcut.key}>
            <Kbd>{shortcut.key}</Kbd> - {shortcut.label}
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
```

**Implementation:**

```typescript
// hooks/useActiveShortcuts.ts
import { useSelector } from 'react-redux';
import { selectActiveShortcuts, selectShortcutsByContext } from '../store/selectors';
import { ShortcutDefinition } from '../typings';

export function useActiveShortcuts(options?: {
  context?: string;
  category?: string;
}): ShortcutDefinition[] {
  const allActive = useSelector(selectActiveShortcuts);
  const contextShortcuts = useSelector(state => 
    options?.context ? selectShortcutsByContext(state, options.context) : null
  );
  
  let shortcuts = options?.context 
    ? Object.values(contextShortcuts || {})
    : allActive;
  
  // Filter by category if specified
  if (options?.category) {
    shortcuts = shortcuts.filter(
      s => s.metadata?.category === options.category
    );
  }
  
  return shortcuts;
}
```

## Best Practices

### Hook Usage

1. **Call hooks directly** - Never pass hooks as props or conditionally call them
2. **Specify dependencies** - Always provide deps array to useShortcut for proper cleanup
3. **Use useShortcutContext** - To get the current context for dynamic registration
4. **Leverage useActiveShortcuts** - For building help UIs, context menus, and overlays

### Shortcut Registration

1. **Register at component level** - Use useShortcut in the component that owns the action
2. **Enable/disable dynamically** - Use the `enabled` property based on component state
3. **Provide payloads** - Pass action payloads directly in the shortcut definition
4. **Use action types** - Always use `action.type` from action creators for consistency

### Dependencies

1. **Minimize deps** - Only include values that affect the shortcut behavior
2. **Stable references** - Use useCallback/useMemo for payload objects to avoid re-registration
3. **Empty deps for static** - Use `[]` for shortcuts that never change

### Context Management

1. **Use ShortcutProvider** - For declarative context establishment
2. **Nest contexts** - Build hierarchies like `Composer.Viewport.Timeline`
3. **Context per feature** - Each major UI area should have its own context
4. **Global fallback** - All shortcuts default to 'Global' if no context provided
