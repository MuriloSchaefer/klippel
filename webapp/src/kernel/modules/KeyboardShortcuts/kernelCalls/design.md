# Kernel Calls Design

This folder contains lifecycle functions for the KeyboardShortcuts module.

## Overview

Kernel calls implement module lifecycle events:
- `startModule` - Initialize module and register shortcuts
- `restartModule` - Restart module (reload shortcuts)
- `shutdownModule` - Cleanup and unregister shortcuts

## Files

- `startModule.ts` - Module initialization logic

## startModule

During module startup, the KeyboardShortcuts module processes shortcuts from all loaded modules:

```typescript
// kernelCalls/startModule.ts
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

## Initialization Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. App Startup                                             │
│     - DynamicStore created                                  │
│     - ModulesProvider initializes                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Module Loader (Loader module)                           │
│     - Loads all modules in dependency order                 │
│     - KeyboardShortcuts depends on: Store, Loader           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  3. KeyboardShortcuts.startModule() called                  │
│     - Gets ModulesManager from Store                        │
│     - Iterates all loaded modules                           │
│     - Finds modules with `shortcuts` field                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  4. For each module with shortcuts:                         │
│     - Extract context and shortcut group                    │
│     - For each shortcut in group:                           │
│       * Dispatch registerShortcut(shortcut)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  5. registerShortcut middleware runs                        │
│     - Checks for conflicts                                  │
│     - Dispatches shortcutRegistered event                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  6. shortcutRegistered reducer runs                         │
│     - Updates shortcuts state                               │
│     - Shortcuts now active and ready                        │
└─────────────────────────────────────────────────────────────┘
```

## Module Registration Example

Here's how a module defines shortcuts that get picked up during startup:

```typescript
// In Composer module's index.ts
import { IModule } from '@kernel/modules/base';
import { saveComposition, undo, redo } from './store/actions';

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
          payload: { direction: 'up' }
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
  
  // ... rest of module definition
};

export default ComposerModule;
```

## Context Naming Convention

Contexts follow a hierarchical naming pattern:

```
Global                          (Always present, lowest priority)
  └─ ModuleName                 (Module root context)
      └─ ModuleName.Component   (Specific component)
          └─ ModuleName.Component.SubComponent  (Nested component)
```

Examples:
- `'Global'` - Always active
- `'Composer'` - Active when Composer is focused
- `'Composer.Viewport'` - Active when Viewport is focused
- `'Composer.Viewport.Timeline'` - Active when Timeline is focused

During startup, if a context key matches the module name exactly, it's used as-is. Otherwise, it's used as a nested context.

## restartModule

Restart the module, potentially reloading shortcuts:

```typescript
// kernelCalls/restartModule.ts
export function restart({ dispatch, managers }: RestartModuleProps) {
  console.log('[KeyboardShortcuts] Module restarting');
  
  // Could implement:
  // 1. Clear all shortcuts
  // 2. Re-register from all modules
  // 3. Reload customizations from session
}
```

## shutdownModule

Cleanup when module is shutting down:

```typescript
// kernelCalls/shutdownModule.ts
export function shutdown({ dispatch, managers }: ShutdownModuleProps) {
  console.log('[KeyboardShortcuts] Module shutting down');
  
  // Could implement:
  // 1. Save customizations to session
  // 2. Unregister all shortcuts
  // 3. Clear context stack
}
```

## Best Practices

### Startup

1. **Register after dependencies** - Ensure Store and Loader are available
2. **Log registration** - Help with debugging module loading issues
3. **Handle errors gracefully** - Don't crash if a module has invalid shortcuts
4. **Validate shortcuts** - Check for required fields during registration

### Dependency Order

The module depends on:
- `'Store'` - For Redux store and managers
- `'Loader'` - For module loading system

Modules that want to register shortcuts should depend on `'KeyboardShortcuts'`:

```typescript
depends_on: ['KeyboardShortcuts', 'Store', ...]
```

### Performance

1. **Batch registrations** - Register all shortcuts before UI renders
2. **Async registration** - Don't block app startup
3. **Lazy loading** - Consider registering shortcuts only when modules activate

### Conflict Detection

During registration, the middleware checks for conflicts:
- Same key in same context
- Priority is used to determine winner
- Warning logged to console
- `shortcutConflictDetected` event dispatched

Modules can listen for this event to handle conflicts programmatically.

## Testing

Test startup by mocking modules with shortcuts:

```typescript
describe('KeyboardShortcuts startup', () => {
  it('registers shortcuts from all modules', () => {
    const mockModules = [
      {
        name: 'TestModule',
        shortcuts: {
          'TestModule': {
            label: 'Test Actions',
            shortcuts: [
              { key: 'Ctrl+t', actionType: 'test/action', label: 'Test' }
            ]
          }
        }
      }
    ];
    
    const mockManagers = {
      storeManager: {
        functions: {
          getModulesManager: () => ({
            getLoadedModules: () => mockModules
          })
        }
      }
    };
    
    const dispatch = jest.fn();
    
    start({ dispatch, managers: mockManagers });
    
    expect(dispatch).toHaveBeenCalledWith(
      registerShortcut({
        key: 'Ctrl+t',
        actionType: 'test/action',
        label: 'Test',
        context: 'TestModule',
        enabled: true
      })
    );
  });
});
```
