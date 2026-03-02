# KeyboardShortcuts Module - Phase 2 Summary

## Overview
Phase 2 implements the Redux store layer and SystemTray integration for the KeyboardShortcuts module. This enables global state management for keyboard shortcuts and provides a UI toggle for showing/hiding keyboard shortcut hints.

## Completed Tasks

### 1. Redux Store Implementation ✅

#### State Shape (`store/state.ts`)
- `shortcuts`: Record<string, Shortcut> - Map of shortcut ID to Shortcut object
- `contextStack`: string[] - Stack of active context IDs (initialized with ['Global'])
- `enabled`: boolean - Master enable/disable flag (default: true)
- `showHints`: boolean - Controls tooltip visibility globally (default: false)

#### Actions (`store/actions.ts`)
**Command Actions (7):**
- `registerShortcut` - Register a new keyboard shortcut
- `unregisterShortcut` - Remove a shortcut by ID
- `pushContext` - Push a context onto the stack
- `popContext` - Pop the top context (protects 'Global')
- `setEnabled` - Set the master enabled flag
- `toggleShowHints` - Toggle hint visibility (NEW)
- `setShowHints` - Set hint visibility explicitly (NEW)

**Event Actions (4):**
- `keyPressed` - Fired when a key is pressed globally
- `shortcutRegistered` - Confirmation event after registration
- `shortcutUnregistered` - Confirmation event after unregistration
- `conflictDetected` - Fired when a shortcut conflicts with an existing one

#### Selectors (`store/selectors.ts`)
**11 Memoized Selectors:**
- `selectShortcuts` - All registered shortcuts
- `selectContextStack` - Current context stack
- `selectEnabled` - Master enabled flag
- `selectShowHints` - Hint visibility flag (NEW)
- `selectShortcutById` - Get shortcut by ID (parameterized)
- `selectActiveShortcuts` - Shortcuts for current contexts + enabled
- `selectShortcutByKey` - Find shortcut by key combination (respects context priority)
- `selectCurrentContext` - Top of context stack
- `selectShortcutsInContext` - All shortcuts for a specific context
- `selectIsContextActive` - Check if context is in stack
- `selectShortcutConflicts` - Find all conflicts in current context

#### Slice (`store/slice.ts`)
Redux slice with extraReducers for all actions:
- Handles shortcut registration with conflict detection and warning
- Prevents duplicate context pushes
- Protects 'Global' context from being popped
- Manages showHints state toggling and setting

### 2. SystemTray Integration ✅

#### KeyboardShortcutsTrayIcon Component
- Toggle button with Keyboard/KeyboardHide icons
- Primary color when hints are visible, default when hidden
- Dispatches `toggleShowHints` action on click
- Wrapped in React.memo for performance
- Automatically registered in SystemTray via component registry

### 3. ShortcutHint Wrapper Component ✅

#### Features
- Wraps any React element to show keyboard shortcut tooltip
- Conditional visibility based on `showHints` state
- Formats key combinations as styled Chip components
- Accepts `shortcutId` prop to identify which shortcut to display
- Optional `alwaysShow` prop to always display tooltip regardless of state
- Configurable placement (top, bottom, left, right)
- Displays both shortcut description and formatted key sequence

#### Usage Example
```tsx
<ShortcutHint shortcutId="layout.ribbon.toggle">
  <Button>Toggle Ribbon</Button>
</ShortcutHint>
```

### 4. Module Integration ✅

#### kernelCalls/index.ts Updates
- Registers Redux reducer with storeManager
- Registers SystemTray icon in component registry using SYSTEM_TRAY_REGISTRY_NAME
- Logs successful initialization

#### index.ts Updates
- Added KeyboardShortcutsTrayIcon to module components
- Added ShortcutHint to module components
- Updated IKeyboardShortcutsModule interface
- Updated module documentation

#### Component Updates
- **KeyboardListener**: Replaced 'as any' cast with proper `keyPressed(key, originalEvent)` action
- **ShortcutProvider**: Replaced 'as any' casts with `pushContext(contextId)` and `popContext()` actions
- Both now properly use `useModule<Store>` and `useAppDispatch`

## Files Created/Modified

### New Files (7)
1. `store/state.ts` - State interface and initial state
2. `store/actions.ts` - Action creators
3. `store/selectors.ts` - Memoized selectors
4. `store/slice.ts` - Redux slice with reducers
5. `store/index.ts` - Barrel export
6. `components/KeyboardShortcutsTrayIcon.tsx` - SystemTray toggle icon
7. `components/ShortcutHint.tsx` - Tooltip wrapper component

### Modified Files (5)
1. `kernelCalls/index.ts` - Redux and SystemTray registration
2. `index.ts` - Module exports and interface
3. `components/KeyboardListener.tsx` - Proper action creator usage
4. `components/ShortcutProvider.tsx` - Proper action creator usage
5. `components/index.ts` - Added new component exports

## Key Technical Decisions

### Action Naming Convention
Follows Redux best practice: `[ModuleName:Command/Event]`
- Commands: User-initiated actions (registerShortcut, toggleShowHints)
- Events: System notifications (keyPressed, conflictDetected)

### Selector Memoization
All selectors use `createSelector` from Redux Toolkit for:
- Performance optimization through memoization
- Automatic dependency tracking
- Derived state computation

### Component Registry Pattern
SystemTray icon registration follows Layout module's pattern:
```typescript
componentRegistryManager.functions.registerComponents({
  [SYSTEM_TRAY_REGISTRY_NAME]: {
    'KeyboardShortcutsTrayIcon': KeyboardShortcutsTrayIcon
  }
});
```

### Hint Display Logic
- Global `showHints` state controls all ShortcutHint tooltips
- Optional `alwaysShow` prop allows exceptions (e.g., for help modals)
- Graceful degradation: missing shortcuts don't break UI

## Testing Checklist

- [x] No TypeScript errors in KeyboardShortcuts module
- [ ] App starts successfully
- [ ] SystemTray icon appears in tray
- [ ] Clicking icon toggles between Keyboard/KeyboardHide icons
- [ ] Redux DevTools shows `showHints` state changing on toggle
- [ ] ShortcutHint wrapper displays tooltip when showHints is true
- [ ] ShortcutHint wrapper hides tooltip when showHints is false
- [ ] Key combinations are formatted correctly as Chip components

## Next Steps (Phase 3)

### Middleware Implementation
1. Create listener middleware to intercept `keyPressed` events
2. Match pressed keys against `selectActiveShortcuts`
3. Dispatch the corresponding action from matched shortcut
4. Handle multiple matches (priority based on context stack order)

### Module Introspection
1. Update `startModule` to iterate through loaded modules
2. Check each module for `shortcuts` field in IModule
3. Automatically dispatch `registerShortcut` for each shortcut
4. Log registered shortcuts for debugging

### Layout Module Integration
1. Add keyboard shortcuts to Layout module's IModule definition
2. Test automatic registration via introspection
3. Wrap Layout buttons with ShortcutHint components
4. Verify end-to-end functionality

### Hooks and Managers
1. Create `useShortcut` hook for imperative registration
2. Create `useKeyPress` hook for custom key handling
3. Add managers for runtime shortcut manipulation
4. Document hook patterns and examples

## Dependencies
- Redux Toolkit - State management and action creators
- Material-UI - Tooltip, Chip, IconButton, Icons
- React Context API - ShortcutContext for scope management
- Store module - Redux hooks and component registry

## Architecture Notes

### State Flow
1. User presses key → KeyboardListener captures event
2. KeyboardListener → dispatch(keyPressed(key, event))
3. Middleware (Phase 3) → matches key against active shortcuts
4. Middleware → dispatches matched shortcut's action
5. Module reducers → handle action and update state

### Context Priority
Context stack implements LIFO priority:
- Top of stack = highest priority
- 'Global' context always at bottom
- `selectShortcutByKey` searches from top to bottom
- First match wins

### Hint Visibility
- SystemTray icon toggles global `showHints` state
- All ShortcutHint components react to state change
- Optional `alwaysShow` prop bypasses global state
- No re-renders unless state actually changes (React.memo)

## Performance Considerations

- **Memoization**: All selectors are memoized with `createSelector`
- **React.memo**: Components wrapped to prevent unnecessary re-renders
- **useCallback**: Event handlers are memoized with dependencies
- **Selective rendering**: ShortcutHint only renders tooltip when needed
- **Shallow comparison**: Redux state updates use immutable patterns

## Success Metrics
- ✅ Zero TypeScript compilation errors
- ✅ Redux store properly registered
- ✅ SystemTray icon registered via component registry
- ✅ All actions follow naming convention
- ✅ Selectors use memoization
- ✅ Components follow React best practices (memo, hooks)
- ⏳ Integration tests pending (Phase 3)
