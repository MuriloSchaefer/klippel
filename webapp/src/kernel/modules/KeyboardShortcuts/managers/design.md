# Managers Design

This folder contains manager classes and hooks for the KeyboardShortcuts module.

## Overview

Managers provide a functional API facade over Redux actions, offering an imperative interface for:
- Registering/unregistering shortcuts
- Managing context stack
- Querying shortcuts
- Enabling/disabling shortcuts

## Files

- `useShortcutManager.ts` - Manager hook providing functional API

## useShortcutManager Hook

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

## Usage Examples

### Programmatic Registration

```typescript
function SomeComponent() {
  const shortcutManager = useModule<IKeyboardShortcuts>('KeyboardShortcuts').managers.shortcutManager();
  
  useEffect(() => {
    // Register a shortcut programmatically
    const cleanup = shortcutManager.functions.register({
      key: 'Ctrl+k',
      actionType: 'myModule/doSomething',
      label: 'Do something',
      context: 'MyModule',
      priority: 100
    });
    
    // Cleanup on unmount
    return cleanup;
  }, []);
}
```

### Context Management

```typescript
function ModalComponent() {
  const shortcutManager = useModule<IKeyboardShortcuts>('KeyboardShortcuts').managers.shortcutManager();
  
  useEffect(() => {
    // Push modal context when opening
    shortcutManager.functions.pushContext('MyModal');
    
    return () => {
      // Pop context when closing
      shortcutManager.functions.popContext('MyModal');
    };
  }, []);
}
```

### Query Shortcuts

```typescript
function ShortcutsList() {
  const shortcutManager = useModule<IKeyboardShortcuts>('KeyboardShortcuts').managers.shortcutManager();
  
  // Get all shortcuts for a specific context
  const composerShortcuts = shortcutManager.functions.getShortcutsForContext('Composer');
  
  // Get current context stack
  const contextStack = shortcutManager.functions.getContextStack();
  
  return (
    <div>
      <h2>Current Context: {contextStack.join(' → ')}</h2>
      <ul>
        {Object.values(composerShortcuts).map(shortcut => (
          <li key={shortcut.key}>
            {shortcut.key}: {shortcut.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Enable/Disable Shortcuts

```typescript
function ShortcutSettings() {
  const shortcutManager = useModule<IKeyboardShortcuts>('KeyboardShortcuts').managers.shortcutManager();
  
  const handleToggle = (context: string, key: string, enabled: boolean) => {
    shortcutManager.functions.setEnabled(context, key, enabled);
  };
  
  return (
    <List>
      {/* ... render shortcuts with toggle switches */}
    </List>
  );
}
```

## Best Practices

### Manager Usage

1. **Prefer hooks over manager** - Use `useShortcut` hook in components instead of manager
2. **Manager for imperative code** - Use manager in non-React code, utilities, or complex logic
3. **Always cleanup** - Use the returned cleanup function from `register()`
4. **Don't store manager reference** - Call `useModule` each time you need the manager

### Redux vs Manager

The manager is a thin wrapper over Redux actions. Choose based on context:

- **Use Redux actions directly** - In middlewares, thunks, or Redux-connected code
- **Use hooks** - In React components (preferred)
- **Use manager** - In imperative code, utilities, or when you need the functional API

### Context Management

1. **Declarative with ShortcutProvider** - Preferred for component-based contexts
2. **Imperative with manager** - For dynamic contexts (modals, temporary states)
3. **Always cleanup** - Pop context when it's no longer active
4. **Order matters** - Context stack is LIFO (last in, first out)

## Architecture Notes

### Why a Manager?

The manager provides:
1. **Functional API** - Clean imperative interface for non-React code
2. **Cleanup utilities** - Built-in cleanup function pattern
3. **Selector integration** - Direct access to derived state
4. **Type safety** - Full TypeScript support with autocomplete

### Manager vs Hooks vs Redux

| Approach | Use Case |
|----------|----------|
| **Redux actions** | Middlewares, reducers, Redux-connected code |
| **Hooks** | React components (declarative, preferred) |
| **Manager** | Imperative code, utilities, complex logic |

All three approaches ultimately dispatch the same Redux actions, ensuring consistency.
