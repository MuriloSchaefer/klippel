# Skill: Add Keyboard Shortcuts to Components

## Overview

This skill teaches how to integrate keyboard shortcuts into React components using the Klippel application's KeyboardShortcuts module. The module provides a centralized, context-aware system for managing keyboard shortcuts with visual hints and conflict detection.

## When to Use This Skill

Use this skill when:
- Adding keyboard shortcuts to a new component or module
- Integrating an existing component with keyboard support
- Creating toolbar buttons, menu items, or dialog actions that should have keyboard shortcuts
- Building context-specific shortcuts (e.g., editor shortcuts only in editor mode)
- Displaying visual hints for keyboard shortcuts to users

## Prerequisites

- Working within the Klippel webapp (React + Vite + Electron)
- Familiarity with React hooks (`useRef`, `useState`)
- Component imports working with path aliases (`@kernel`, `@system`)
- The `KeyboardShortcuts` module is loaded in the app

## Core Concepts

### Architecture Overview

The KeyboardShortcuts system follows the micro-kernel pattern:
- **Manager API**: `useKeyboardShortcutsManager()` for imperative shortcut registration/unregistration
- **Components**: `ShortcutHint`, `ShortcutProvider`, `KeyboardListener`
- **Redux-backed**: Shortcuts stored in Redux state with validation middleware
- **Context-scoped**: Shortcuts can be scoped to specific UI contexts via `ShortcutProvider`

### Shortcut Definition

A shortcut definition has these required properties:

```typescript
interface Shortcut {
  id: string;              // Unique identifier (module.feature.action format)
  key: string;             // Keyboard combination (e.g., "Ctrl+s", "Alt+1")
  description: string;     // Human-readable label (shown in help/hints)
  contextId: string;       // Context scope (Global, Modal, Editor, etc.)
  action: () => void;      // Callback function
  enabled: boolean;        // Whether currently active
}
```

## ❌ FORBIDDEN: Never Register Shortcuts in useEffect

**Registering shortcuts inside `useEffect` (or `useMemo`) is forbidden — no exceptions.**

This pattern causes:

1. **Duplicate Shortcuts** — `useEffect` runs on every dependency change, registering the same shortcut multiple times
2. **Memory Leaks** — Multiple unregistered copies remain in Redux state
3. **Performance Degradation** — Redux state grows unbounded with duplicate shortcuts
4. **Stale Closures** — Actions close over stale values from previous renders
5. **Difficult Debugging** — Redux DevTools shows many duplicate registrations

```typescript
// ❌ FORBIDDEN — never do this
const MyComponent: React.FC = () => {
  const keyboardManager = useKeyboardShortcutsManager();

  useEffect(() => {
    keyboardManager.functions.registerShortcuts([{
      id: 'myModule.save',
      key: 'Ctrl+s',
      // ...
    }]);
    return () => {
      keyboardManager.functions.unregisterShortcuts(['myModule.save']);
    };
  }, []);

  return <div>...</div>;
};
```

## ✅ The One Correct Pattern

**Always register shortcuts in the module's boot hook. Always activate them via `ShortcutProvider` in the component.**

This is the default for every shortcut, without exception.

### Step 1: Register in Boot Hook

Register shortcuts once in `postBootInitialization` (or `startModule` for very early shortcuts):

```typescript
// src/system/modules/MyModule/kernelCalls/index.ts
import type { PostBootInitializationProps } from '@kernel/modules/base';
import type { KeyboardShortcuts } from '@kernel/modules/KeyboardShortcuts';

export const postBootInitialization = (props: PostBootInitializationProps) => {
  const { managers } = props;

  const keyboardManager = managers
    .useModule<KeyboardShortcuts>('KeyboardShortcuts')
    .managers.useKeyboardShortcutsManager();

  keyboardManager.functions.registerShortcuts([
    {
      id: 'myModule.save',
      key: 'Ctrl+s',
      description: 'Save document',
      contextId: 'MyModule/EditorPanel',
      action: () => managers.dispatch(saveDocument()),
      enabled: true,
    },
    {
      id: 'myModule.undo',
      key: 'Ctrl+z',
      description: 'Undo',
      contextId: 'MyModule/EditorPanel',
      action: () => managers.dispatch(undo()),
      enabled: true,
    },
  ]);
};
```

### Step 2: Activate via ShortcutProvider in Component

Wrap the relevant component subtree with **one** `ShortcutProvider`. All shortcuts for this component share the same `contextId` so a single provider activates all of them.

```typescript
// src/system/modules/MyModule/components/EditorPanel/index.tsx
import useModule from '@kernel/hooks/useModule';
import type { KeyboardShortcuts } from '@kernel/modules/KeyboardShortcuts';

const EditorPanel: React.FC = () => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>('KeyboardShortcuts');
  const { ShortcutProvider } = keyboardShortcuts.components;

  return (
    <ShortcutProvider contextId="MyModule/EditorPanel">
      {/* all MyModule/EditorPanel shortcuts are active within this subtree */}
      <EditorContent />
    </ShortcutProvider>
  );
};
```

### Step 3: Display Visual Hint (Optional)

```typescript
const SaveButton: React.FC<{ onSave: () => void }> = ({ onSave }) => {
  const { ShortcutHint } = useModule<KeyboardShortcuts>('KeyboardShortcuts').components;

  return (
    <ShortcutHint shortcutId="myModule.save" placement="bottom-right">
      <Button onClick={onSave}>Save</Button>
    </ShortcutHint>
  );
};
```

## Implementation Patterns

### Pattern 1: Simple Button with Visual Hint

**Use when**: Simple UI elements (Button, IconButton) where wrapping is safe.

```typescript
// Boot registration
export const postBootInitialization = (props: PostBootInitializationProps) => {
  const keyboardManager = /* ... */;

  keyboardManager.functions.registerShortcuts([{
    id: 'MyModule.save',
    key: 'Ctrl+s',
    description: 'Save',
    contextId: 'MyModule/SaveButton',
    action: () => props.managers.dispatch(saveDocument()),
    enabled: true,
  }]);
};

// Component: provider activates the context, hint renders the badge
export const SaveButton: React.FC<{ onSave: () => void }> = ({ onSave }) => {
  const { ShortcutHint, ShortcutProvider } =
    useModule<KeyboardShortcuts>('KeyboardShortcuts').components;

  return (
    <ShortcutProvider contextId="MyModule/SaveButton">
      <ShortcutHint shortcutId="MyModule.save" placement="bottom-right">
        <Button onClick={onSave} variant="contained">Save</Button>
      </ShortcutHint>
    </ShortcutProvider>
  );
};
```

### Pattern 2: Context-Scoped Shortcuts

**Use when**: Shortcuts should only fire while a specific UI section is visible.

```typescript
// Boot registration
keyboardManager.functions.registerShortcuts([{
  id: 'MyModule.undo',
  key: 'Ctrl+z',
  description: 'Undo',
  contextId: 'MyModule/EditorPanel',
  action: () => props.managers.dispatch(undo()),
  enabled: true,
}]);

// Component — provider activates the context while mounted
export const EditorPanel: React.FC = () => {
  const { ShortcutProvider } = useModule<KeyboardShortcuts>('KeyboardShortcuts').components;

  return (
    <ShortcutProvider contextId="MyModule/EditorPanel">
      <EditorContent />   {/* undo shortcut active here */}
    </ShortcutProvider>
  );
};
```

### Pattern 3: Conditional/Dynamic Enable State

**Use when**: A shortcut should be enabled or disabled based on app state.

Register once at boot with `enabled: true`. Toggle the `enabled` flag through Redux by dispatching an update action — do **not** re-register in a component.

```typescript
// Boot registration (always registered; enabled state driven by Redux)
keyboardManager.functions.registerShortcuts([{
  id: 'MyModule.togglePlay',
  key: 'Space',
  description: 'Play/Pause',
  contextId: 'MyModule/PlaybackControls',
  action: () => props.managers.dispatch(togglePlayback()),
  enabled: true,
}]);

// Component activates the context
const PlaybackControls: React.FC = () => {
  const { ShortcutProvider } = useModule<KeyboardShortcuts>('KeyboardShortcuts').components;

  return (
    <ShortcutProvider contextId="MyModule/PlaybackControls">
      <PlayButton />
    </ShortcutProvider>
  );
};
```

### Pattern 4: Multiple Shortcuts in One Component

**Use when**: Components with many related keyboard shortcuts.

All shortcuts for the same component share one `contextId` (`Module/Component`). A single `ShortcutProvider` activates all of them — never nest multiple providers in the same component.

```typescript
// Boot registration — all shortcuts share the same contextId
keyboardManager.functions.registerShortcuts([
  { id: 'editor.save',  key: 'Ctrl+s',       description: 'Save',  contextId: 'Editor/Panel', action: () => dispatch(save()),     enabled: true },
  { id: 'editor.undo',  key: 'Ctrl+z',       description: 'Undo',  contextId: 'Editor/Panel', action: () => dispatch(undo()),     enabled: true },
  { id: 'editor.redo',  key: 'Ctrl+Shift+z', description: 'Redo',  contextId: 'Editor/Panel', action: () => dispatch(redo()),     enabled: true },
  { id: 'editor.find',  key: 'Ctrl+f',       description: 'Find',  contextId: 'Editor/Panel', action: () => dispatch(openFind()), enabled: true },
]);

// Component — one provider activates all of them
export const AdvancedEditor: React.FC = () => {
  const { ShortcutProvider } = useModule<KeyboardShortcuts>('KeyboardShortcuts').components;

  return (
    <ShortcutProvider contextId="Editor/Panel">
      <EditorContent />
    </ShortcutProvider>
  );
};
```

### Pattern 5: Dynamic Shortcuts Based on Data (e.g., Tabs)

**Use when**: Shortcuts are generated from a list that is known at module load time (e.g., from a store selector or static config).

Register shortcuts from the boot hook, reading data from the Redux store directly. The action dispatches to Redux — components do not hold the shortcut state.

```typescript
// Boot registration — read tab list from store at boot time
export const postBootInitialization = (props: PostBootInitializationProps) => {
  const { managers } = props;
  const state = managers.getState();
  const tabs = selectTabs(state);  // read from Redux at boot

  const keyboardManager = managers
    .useModule<KeyboardShortcuts>('KeyboardShortcuts')
    .managers.useKeyboardShortcutsManager();

  keyboardManager.functions.registerShortcuts(
    tabs.map((tab, index) => ({
      id: `layout.ribbon.tab.${tab.id}`,
      key: `Alt+${index + 1}`,
      description: `Switch to ${tab.label}`,
      contextId: 'Layout/RibbonMenu',
      action: () => managers.dispatch(selectTab(tab.id)),
      enabled: true,
    }))
  );
};

// Component just activates the context
export const RibbonMenu: React.FC = () => {
  const { ShortcutProvider } = useModule<KeyboardShortcuts>('KeyboardShortcuts').components;

  return (
    <ShortcutProvider contextId="Layout/RibbonMenu">
      <TabList />
    </ShortcutProvider>
  );
};
```

If the tab list changes at runtime, update shortcut registrations by dispatching through the module's Redux slice — not by calling `registerShortcuts` inside a component.

### Pattern 6: Manual Hint Rendering (Advanced)

**Use when**: Wrapping components breaks functionality (e.g., MUI Tabs, Grid, List).

Register in boot as usual. Render the hint badge manually using store selectors.

```typescript
// Boot registration (same as any other pattern)
export const postBootInitialization = (props: PostBootInitializationProps) => {
  keyboardManager.functions.registerShortcuts([{
    id: 'complex.action',
    key: 'Ctrl+Alt+x',
    description: 'Custom action',
    contextId: 'MyModule/ComplexPanel',
    action: () => props.managers.dispatch(doAction()),
    enabled: true,
  }]);
};

// Component — manual hint rendering
const ComplexPanel: React.FC = () => {
  const storeModule = useModule<Store>('Store');
  const { useAppSelector } = storeModule.hooks;

  const keyboardShortcuts = useModule<KeyboardShortcuts>('KeyboardShortcuts');
  const { ShortcutProvider } = keyboardShortcuts.components;
  const { keyboardHintContainerSx, keyboardHintKeySx, keyboardHintKeyPressedSx, keyboardHintSeparatorSx } = keyboardShortcuts.styles;

  const showHints = useAppSelector(selectShowHints);
  const pressedKeys = useAppSelector(selectPressedKeys);
  const elementRef = useRef<HTMLElement | null>(null);

  const renderHint = (shortcutKey: string) => {
    if (!showHints || !elementRef.current) return null;
    const keyParts = shortcutKey.split('+');
    const isPressed = keyParts.some(part => pressedKeys.includes(part));

    return (
      <Box sx={{ position: 'absolute', ...keyboardHintContainerSx }}>
        {keyParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Box sx={keyboardHintSeparatorSx}>+</Box>}
            <Chip label={part} size="small" sx={isPressed ? keyboardHintKeyPressedSx : keyboardHintKeySx} />
          </React.Fragment>
        ))}
      </Box>
    );
  };

  return (
    <ShortcutProvider contextId="MyModule/ComplexPanel">
      <Box ref={elementRef} sx={{ position: 'relative' }}>
        {renderHint('Ctrl+Alt+x')}
        {/* panel content */}
      </Box>
    </ShortcutProvider>
  );
};
```

## Naming Conventions

### Shortcut ID Format

Follow this dot-separated pattern:

```
{module}.{feature}.{action}[.{identifier}]
```

**Examples**:
- `layout.ribbon.tab.file` — Layout module, ribbon menu, tab selection, file tab
- `composer.tool.select` — Composer module, tool selection
- `materials.item.edit` — Materials module, item editing
- `editor.paste` — Editor module, paste action
- `viewport.panUp` — Viewport module, pan up action

**Rules**:
- Use lowercase with dots as separators
- Be descriptive and hierarchical
- Make IDs searchable in codebase
- Don't use dashes or underscores within ID (only dots)

### CRUD binding convention (`a` / `e` / `d`)

**Every list-style surface (Material, Graduation, Visualization, …) uses the same bare letters for create/update/delete:**

| Action | Binding |
|---|---|
| Add a new item to the list | `a` |
| Edit the focused item | `e` |
| Delete the focused item | `d` |

**Why:** muscle memory — once a user learns one list, every other list works the same. Diverging per-list (e.g. `r` for rename) is the inconsistency this rule eliminates.

**How to apply:**

- Each list registers its bindings under its **own dedicated context** (`${MODULE_NAME}/${ListName}`), e.g. `Composer/MaterialList`, `Composer/GraduationList`, `Composer/VisualizationList`. The dedicated context is non-negotiable: `a` / `e` / `d` will collide across lists if they share a parent context, so each list must own a `ShortcutProvider` whose `contextId` is active **only** while that list is mounted/focused.
- Activate via the list's own `ShortcutProvider` — `a` / `e` / `d` only fire while the list is the active context, so the same letters can mean "add material" inside the material list and "add visualization" inside the visualization list without conflict.
- `e` and `d` always operate on the **focused row** (resolved via `document.activeElement.closest('[data-testid="<list>-item"]')`); `a` always opens the list's add affordance.
- Reorder, rename-distinct-from-edit, and other list-specific actions get their own letters (e.g. `w` / `s` for reorder) and must not shadow `a` / `e` / `d`.
- New lists adopt this convention from day one. Existing lists that diverge (e.g. graduation's `g` / `r` / `d`) should be migrated as a follow-up, not left as an exception.
- Each control still renders `ShortcutHint` per the no-shortcut-without-a-hint rule (CLAUDE.md).

If a chord variant is needed (e.g. for a list-level "add many" affordance), use `Shift+A` / `Shift+E` / `Shift+D` — keep the letter consistent with the action.

### Key Combination Format

**Rules**:
- Modifiers in order: `Ctrl`, `Alt`, `Shift`
- Always use `+` separator between keys
- Single letters lowercase: `Ctrl+s`
- Numbers as-is: `Alt+1`
- Special keys capitalized: `Escape`, `Enter`, `Space`, `Tab`, `Delete`, `Backspace`, `ArrowUp`, etc.

**Valid Examples**:
```
Ctrl+s
Alt+1
Ctrl+Shift+z
Escape
Space
Alt+Shift+f
```

### Context ID Format

**Standard Format**: `${MODULE_NAME}/${ComponentName}`

- `Global` — Available everywhere (use sparingly; prefer scoped contexts)
- `${MODULE_NAME}/${ComponentName}` — Scoped to a specific component
  - `MODULE_NAME`: The module that owns the shortcut
  - `ComponentName`: The component that mounts the `ShortcutProvider`

**All shortcuts belonging to the same component share the same `contextId`.** One `contextId` per component, one `ShortcutProvider` per component.

**Examples**:
```typescript
contextId: 'Global'                   // Everywhere (avoid when possible)
contextId: 'Composer/EditorPanel'     // All shortcuts in EditorPanel from Composer module
contextId: 'Layout/RibbonMenu'        // All shortcuts in RibbonMenu from Layout module
contextId: 'SVG/ViewerPanel'          // All shortcuts in ViewerPanel from SVG module
```

## Key Best Practices

### 1. Register in Boot, Activate via Provider (CRITICAL)

| Do | Don't |
|----|-------|
| Register in `postBootInitialization` or `startModule` | Register in `useEffect` |
| Use **one** `ShortcutProvider` per component | Nest multiple `ShortcutProvider`s in the same component |
| Share one `contextId` across all shortcuts of a component | Give each shortcut its own `contextId` |
| Dispatch Redux actions from shortcut handlers | Close over component state in shortcut actions |
| Use `contextId` scoping to control when shortcuts fire | Use `Global` context for component-specific shortcuts |

### 2. Actions Must Dispatch to Redux

Shortcut actions are registered at boot, before component state exists. They must be pure Redux dispatchers:

```typescript
// ✅ Correct — dispatch to Redux
action: () => props.managers.dispatch(saveDocument()),

// ❌ Wrong — closes over component state that doesn't exist at boot
action: () => setIsOpen(true),
```

If a shortcut genuinely needs to affect local component state, reconsider the architecture — that state likely belongs in Redux.

### 3. Use Descriptive Descriptions

The description appears in shortcuts overlay, help dialogs, and settings:

```typescript
// ❌ Unclear
description: 'Toggle'

// ✅ Clear
description: 'Toggle playback (play/pause)'
```

### 4. Use Proper Context Format to Avoid Conflicts

```typescript
// ❌ WRONG: Simple context name (too broad)
{ id: 'editor.save', key: 'Ctrl+s', contextId: 'Editor' }

// ❌ WRONG: Per-action context ID (creates multiple providers)
{ id: 'editor.save', key: 'Ctrl+s', contextId: 'MyModule/EditorPanel/save' }
{ id: 'editor.undo', key: 'Ctrl+z', contextId: 'MyModule/EditorPanel/undo' }

// ✅ CORRECT: One context per component, shared by all its shortcuts
{ id: 'editor.save', key: 'Ctrl+s', contextId: 'MyModule/EditorPanel' }
{ id: 'editor.undo', key: 'Ctrl+z', contextId: 'MyModule/EditorPanel' }
```

Always follow: `${MODULE_NAME}/${ComponentName}`

### 5. Check for Existing Shortcuts Before Adding

```bash
grep -r "Ctrl\\+s" webapp/src/
```

### 6. Consider Cross-Platform Keys

- Use `Ctrl` for both Windows/Linux (system handles conversion)
- Avoid Mac-only shortcuts like `Cmd+Delete`
- Test on different keyboard layouts

### 7. Preserve Input Field Typing

Shortcuts are automatically disabled when typing in `<input>`, `<textarea>`, and `contenteditable` elements. Exceptions: Escape, Enter, Tab still work in inputs.

## Troubleshooting

### Shortcut Not Triggering

**Checklist**:
1. Check Redux DevTools for `KeyboardShortcuts.shortcuts` state — is it registered?
2. Verify `contextId` is active (look at `contextStack` in Redux state)
3. Verify a `ShortcutProvider` with the matching `contextId` is mounted
4. Check if shortcut is `enabled: true`
5. Check if user is typing in an input field

**Debug**:
```typescript
action: () => {
  console.log('[KeyboardShortcuts] Action triggered');
  dispatch(doAction());
}
```

### Visual Hint Not Showing

**Checklist**:
1. Verify `showHints` is true (toggle with Alt key)
2. Check shortcut ID in `ShortcutHint` matches registered ID
3. Verify `ShortcutProvider` is an ancestor of `ShortcutHint`
4. Check browser console for errors

### Shortcut Conflicts

**How to detect**:
1. Use Redux DevTools to view all shortcuts
2. Search for duplicate `key + contextId` combinations
3. Use `grep` to find similar patterns

**Resolution**:
1. Change to less-used key combination
2. Move to more specific context
3. Check if shortcut should actually be available in that context

### Shortcut Firing When It Shouldn't

**Cause**: Context ID is too broad (e.g., `Global`) or `ShortcutProvider` is mounted higher than intended.

**Fix**: Narrow the `contextId` and place `ShortcutProvider` only where the shortcut should be active.

## Disabling Shortcuts Temporarily

```typescript
// Globally disable all shortcuts
keyboardManager.functions.disableAllShortcuts();

// Re-enable
keyboardManager.functions.enableAllShortcuts();
```

## Testing Checklist

When adding shortcuts to a component, verify:

- [ ] Shortcut is registered in `postBootInitialization` or `startModule`, not in a component
- [ ] Shortcut action dispatches to Redux (no component state closures)
- [ ] `ShortcutProvider` with matching `contextId` is mounted in the component tree
- [ ] Shortcut triggers the correct action
- [ ] Shortcut appears in Redux state (`KeyboardShortcuts.shortcuts`)
- [ ] Shortcut only fires while the provider is mounted
- [ ] Visual hint appears when global hints enabled (toggle with Alt)
- [ ] Visual hint highlights when keys are pressed
- [ ] Doesn't interfere with typing in input fields
- [ ] Doesn't conflict with existing shortcuts (check Redux DevTools)

## Reference Resources

- **Module Index**: `../index.ts`
- **Design Document**: `../DESIGN.md`
- **Architecture**: `../architecture.md`
- **Simple Example**: `../assets/shortcut-hint-wrapper-example.tsx`
- **Dynamic Example**: `../assets/ribbon-menu-example.tsx`
- **Visual Hints Example**: `../assets/visual-hints-example.tsx`
- **Type Definitions**: `@kernel/modules/base.ts` (Shortcut interface)
- **Real Implementation**: `src/kernel/modules/Layout/components/RibbonMenu/index.tsx`

## See Also

- Redux hooks (useDispatch, useSelector) from Store module
- MUI documentation for component wrapping techniques
- Custom context providers (ShortcutProvider)
