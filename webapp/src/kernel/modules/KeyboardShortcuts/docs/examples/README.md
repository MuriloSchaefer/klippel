# Keyboard Shortcuts Examples

This folder contains practical, ready-to-use code examples for integrating keyboard shortcuts into React components using the KeyboardShortcuts module.

## Quick Index

| Example | Use Case | Complexity |
|---------|----------|-----------|
| [simple-button-with-hint.tsx](#simple-button-with-hint) | Add shortcut to a simple button | ⭐ Beginner |
| [multiple-shortcuts.tsx](#multiple-shortcuts) | Multiple related shortcuts in one component | ⭐⭐ Intermediate |
| [context-scoped-example.tsx](#context-scoped-shortcuts) | Shortcuts active only in specific contexts | ⭐⭐ Intermediate |
| [dynamic-shortcuts.tsx](#dynamic-shortcuts) | Generate shortcuts from data (tabs, lists) | ⭐⭐⭐ Advanced |
| [manual-hint-rendering.tsx](#manual-hint-rendering) | Render hints without wrapping (for complex layouts) | ⭐⭐⭐ Advanced |

## Examples

### Simple Button with Hint

**File**: `simple-button-with-hint.tsx`

The simplest way to add a keyboard shortcut to a component.

```typescript
import { SaveButton } from './examples/simple-button-with-hint';

// Usage in your component:
<SaveButton onSave={() => handleSave()} />
```

**Key Points**:
- Use `ShortcutHint` wrapper component
- Register shortcut in `useEffect`
- Always cleanup on unmount
- Minimal code needed

**When to Use**:
- Adding shortcuts to simple UI elements (Button, IconButton, etc.)
- Wrapping the component doesn't break functionality
- You want minimal code

---

### Multiple Shortcuts in One Component

**File**: `multiple-shortcuts.tsx`

Register many related shortcuts in a single component (e.g., editor shortcuts).

```typescript
import { AdvancedEditor } from './examples/multiple-shortcuts';

// Usage:
<AdvancedEditor />
```

**Features**:
- Multiple shortcuts managed together
- Enable/disable based on state (canUndo, canRedo)
- Automatic cleanup of all shortcuts
- DRY pattern for related shortcuts

**When to Use**:
- Component has many related shortcuts
- Want to manage them as a group
- Need conditional enabling/disabling

---

### Context-Scoped Shortcuts

**File**: `context-scoped-example.tsx`

Scope shortcuts to specific UI contexts so they only activate in those contexts.

```typescript
import { EditorPanel, EditorContent } from './examples/context-scoped-example';

// Usage:
<EditorPanel>
  <EditorContent />
</EditorPanel>
```

**Concepts**:
- `ShortcutProvider` establishes context scope
- Shortcuts registered with matching `contextId` only activate in that context
- Avoid conflicts between different features' shortcuts
- Same key can mean different things in different contexts

**When to Use**:
- Shortcuts should only work in specific panels
- Multiple editors/tools with different shortcuts
- Avoid global shortcut conflicts

---

### Dynamic Shortcuts

**File**: `dynamic-shortcuts.tsx`

Generate shortcuts dynamically from component state or data.

```typescript
import { 
  TabsWithShortcuts, 
  MenuWithShortcuts, 
  ListWithShortcuts 
} from './examples/dynamic-shortcuts';

// Usage:
<TabsWithShortcuts />
<MenuWithShortcuts />
<ListWithShortcuts />
```

**Examples Included**:
1. **TabsWithShortcuts**: Alt+1, Alt+2, Alt+3 to switch tabs
2. **MenuWithShortcuts**: Alt+A, Alt+B, Alt+C for menu items
3. **ListWithShortcuts**: Ctrl+1, Ctrl+2, Ctrl+3 for list items

**Key Pattern**:
```typescript
// Create shortcuts from data
const shortcuts = items.map((item, index) => ({
  id: `menu.${item.id}`,
  key: `Alt+${index + 1}`,
  description: item.label,
  contextId: 'Global',
  action: () => selectItem(item.id),
  enabled: true,
}));

// Register and cleanup in useEffect
keyboardManager.functions.registerShortcuts(shortcuts);
return () => keyboardManager.functions.unregisterShortcuts(ids);
```

**When to Use**:
- Shortcuts generated from dynamic data
- Number of shortcuts changes based on state
- Components render lists/tabs/items with shortcuts

---

### Manual Hint Rendering

**File**: `manual-hint-rendering.tsx`

Render keyboard hints manually without wrapping components (for complex layouts).

```typescript
import { 
  TabsWithManualHints,
  ButtonWithInlineHint,
  GridWithHints
} from './examples/manual-hint-rendering';

// Usage:
<TabsWithManualHints />
<ButtonWithInlineHint />
<GridWithHints />
```

**Examples Included**:
1. **TabsWithManualHints**: Hints above MUI Tabs (can't wrap)
2. **ButtonWithInlineHint**: Inline hints next to button
3. **GridWithHints**: Hints on grid items

**Key Concepts**:
- Get `showHints` and `pressedKeys` from Redux
- Render hints in separate container
- Position hints manually (absolute positioning)
- Still register shortcuts normally
- Full control over appearance and placement

**When to Use**:
- ShortcutHint wrapper would break functionality
- Need precise hint positioning
- Complex parent constraints
- Custom hint appearance needed

---

## Common Patterns

### Pattern: Cleanup on Unmount

```typescript
useEffect(() => {
  keyboardManager.functions.registerShortcuts(shortcuts);
  
  return () => {
    keyboardManager.functions.unregisterShortcuts(
      shortcuts.map(s => s.id)
    );
  };
}, []);  // Critical: include dependencies!
```

### Pattern: Conditional Enabling

```typescript
const shortcuts = [
  {
    id: 'editor.undo',
    key: 'Ctrl+z',
    action: handleUndo,
    enabled: canUndo,  // Only enabled when true
  },
];

useEffect(() => {
  keyboardManager.functions.registerShortcuts(shortcuts);
  return () => keyboardManager.functions.unregisterShortcuts([...]);
}, [canUndo]);  // Re-register when state changes
```

### Pattern: DRY Shortcut Definitions

```typescript
const createShortcuts = (baseId: string, shortcuts: Partial<Shortcut>[]) => {
  return shortcuts.map(s => ({
    id: `${baseId}.${s.id}`,
    contextId: 'Global',
    enabled: true,
    ...s,
  }));
};

const shortcuts = createShortcuts('editor', [
  { id: 'save', key: 'Ctrl+s', description: 'Save', action: handleSave },
  { id: 'undo', key: 'Ctrl+z', description: 'Undo', action: handleUndo },
]);
```

## Naming Conventions

### Shortcut IDs

Follow this pattern: `{module}.{feature}.{action}[.{identifier}]`

```
layout.ribbon.tab.file     ✅ Clear hierarchy
editor.save                ✅ Simple and searchable
toolbar.button.bold        ✅ Specific to component
action1                    ❌ Not descriptive
```

### Keyboard Keys

```
Ctrl+s                     ✅ Simple combination
Alt+1, Alt+2              ✅ Alt with numbers
Ctrl+Shift+z              ✅ Multiple modifiers
Ctrl+Alt+Delete           ✅ Full combination
```

### Context IDs

```
Global                     ✅ Available everywhere
EditorPanel               ✅ Feature-specific
Modal                     ✅ Modal-only shortcuts
```

## Debugging Tips

### Check if shortcut is registered

1. Open Redux DevTools (F12 → Redux tab)
2. Look for `KeyboardShortcuts.shortcuts` state
3. Your shortcut ID should appear in the list

### Check if shortcut is triggering

1. Add `console.log()` in your action function
2. Check Redux state shows shortcut registered
3. Verify you're in the right context

### Visual hints not showing

1. Toggle hints with Alt key
2. Check `showHints` in Redux state
3. Verify `shortcutId` matches registered ID

### Shortcut conflicts

1. Search codebase for similar key combinations
2. Use Redux DevTools to see all registered shortcuts
3. Change to less-used key or scope to specific context

## Best Practices

### ✅ Do

- Always cleanup shortcuts in useEffect return
- Use descriptive shortcut IDs
- Provide clear descriptions
- Scope to contexts when appropriate
- Test on different keyboards

### ❌ Don't

- Forget useEffect cleanup (causes memory leaks)
- Use generic IDs like `action1` or `toggle`
- Override browser shortcuts (Ctrl+T, Ctrl+W)
- Store non-serializable objects in Redux
- Wrap with ShortcutHint if it breaks layout

## File Structure

```
docs/examples/
├── simple-button-with-hint.tsx      # Beginner example
├── multiple-shortcuts.tsx           # Intermediate example
├── context-scoped-example.tsx       # Intermediate example
├── dynamic-shortcuts.tsx            # Advanced example
├── manual-hint-rendering.tsx        # Advanced example
└── README.md                        # This file
```

## Recommended Learning Path

1. Start with **simple-button-with-hint.tsx** — understand basics
2. Try **multiple-shortcuts.tsx** — manage many shortcuts
3. Explore **context-scoped-example.tsx** — avoid conflicts
4. Study **dynamic-shortcuts.tsx** — data-driven shortcuts
5. Learn **manual-hint-rendering.tsx** — advanced layouts

## Related Documentation

- **SKILL.md** — Comprehensive skill guide
- **DESIGN.md** — Architecture and design
- **README.md** — Module overview
- **Type Definitions** — `@kernel/modules/base.ts`

## Questions?

Refer to the SKILL.md file for detailed explanations, best practices, and troubleshooting.
