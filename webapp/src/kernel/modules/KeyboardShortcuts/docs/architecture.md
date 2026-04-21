# KeyboardShortcuts Module Architecture

## Overview

The KeyboardShortcuts module provides a comprehensive system for managing keyboard shortcuts across the application. It supports context-based shortcut scoping, visual feedback, and global keyboard event capture.

## Core Components

### 1. KeyboardListener

**Location**: `components/KeyboardListener.tsx`

**Purpose**: Global keyboard event capture and normalization

**Key Features**:
- Listens to all keyboard events at the window level
- Normalizes keyboard events to a consistent format (e.g., `Alt+1`, `Ctrl+Shift+s`)
- Tracks pressed keys for visual feedback
- Toggles hint visibility when Alt is pressed alone
- Prevents browser default behavior for registered shortcuts

**Implementation Details**:
```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  // 1. Check if event should be ignored (e.g., typing in input)
  if (shouldIgnoreKeyEvent(event)) return;
  
  // 2. Track Alt-alone presses for toggling hints
  if (event.key === 'Alt' && !event.ctrlKey && !event.shiftKey) {
    altAloneRef.current = true;
  }
  
  // 3. Normalize key event (uses event.code for reliability)
  const key = formatKeyEvent(event);
  
  // 4. Build keyParts for visual feedback
  const keyParts = key ? key.split('+') : buildModifierParts(event);
  
  // 5. Dispatch to Redux
  dispatch(keyPressed(key || keyParts.join('+'), keyParts, eventDetails));
}
```

**Key Normalization**:
- Uses `event.code` for number and letter keys to avoid keyboard layout issues
- Modifier order: always `Ctrl+Alt+Shift+Key`
- Example: Pressing Alt+1 on any keyboard layout → `Alt+1`

### 2. ShortcutProvider

**Location**: `components/ShortcutProvider.tsx`

**Purpose**: Context-based shortcut scoping

**Usage**:
```tsx
<ShortcutProvider contextId="Modal">
  {/* Shortcuts registered with contextId="Modal" are active here */}
</ShortcutProvider>
```

**How it works**:
- Pushes context onto stack when mounted
- Pops context when unmounted
- Shortcuts are matched against the current context stack

### 3. ShortcutHint

**Location**: `components/ShortcutHint.tsx`

**Purpose**: Visual wrapper component for showing keyboard hints

**Props**:
- `shortcutId`: ID of the shortcut to display
- `placement`: Badge position (`top-left`, `top-right`, `bottom-left`, `bottom-right`)
- `alwaysShow`: Show hint even when global hints are disabled

**Visual Behavior**:
- Not pressed: Grayed out (`rgba(128, 128, 128, 0.5)`)
- Pressed: Contrasting color from theme (`secondary.main`)
- Includes keyboard icon that changes color

**Limitations**:
- Wrapping certain components (like MUI Tab) breaks their parent's functionality
- For complex layouts, use manual hint rendering with exported styles

### 4. KeyboardShortcutsTrayIcon

**Location**: `components/KeyboardShortcutsTrayIcon.tsx`

**Purpose**: System tray icon for toggling hint visibility

## State Management

### Redux Store Structure

```typescript
interface KeyboardShortcutsState {
  shortcuts: Record<string, Shortcut>;  // All registered shortcuts
  contextStack: string[];                // Active contexts (LIFO)
  enabled: boolean;                      // Global on/off switch
  showHints: boolean;                    // Visual hints visibility
  pressedKeys: string[];                 // Currently pressed keys
}
```

### Shortcut Definition

```typescript
interface Shortcut {
  id: string;              // Unique identifier (e.g., "layout.ribbon.tab.file")
  key: string;             // Key combination (e.g., "Alt+1")
  contextId: string;       // Context scope (e.g., "Global", "Modal")
  action: CallableFunction | null;  // Function to execute
  description?: string;    // Human-readable description
  enabled?: boolean;       // Individual shortcut toggle
}
```

### Key Actions

**Registration**:
```typescript
dispatch(registerShortcut({ id, key, contextId, action, description, enabled }));
```

**Unregistration**:
```typescript
dispatch(unregisterShortcut(shortcutId));
```

**Toggle Hints**:
```typescript
dispatch(toggleShowHints());
```

**Key Pressed** (dispatched by KeyboardListener):
```typescript
dispatch(keyPressed(key, keyParts, eventDetails));
```

## Middleware

**Location**: `store/middleware.ts`

**Purpose**: Match key presses to shortcuts and execute actions

**Flow**:
1. Listen for `keyPressed` actions
2. Check if shortcuts system is enabled
3. Skip modifier-only keys (just visual feedback)
4. Query `selectShortcutByKey` to find matching shortcut
5. If found, dispatch the shortcut's action

```typescript
const matchedShortcut = selectShortcutByKey(key)(state);
if (matchedShortcut && matchedShortcut.action) {
  dispatch(matchedShortcut.action);
}
```

## Exported Styles

The module exports reusable style objects for custom hint implementations:

```typescript
module.styles = {
  keyboardHintContainerSx,    // Badge container
  keyboardHintKeySx,          // Key chip (not pressed)
  keyboardHintKeyPressedSx,   // Key chip (pressed)
  keyboardHintSeparatorSx,    // '+' separator
  keyboardHintWrapperSx,      // Wrapper for components with hints
  getBadgePosition,           // Helper function
  KEYBOARD_HINT_WRAPPER_CLASS // CSS class constant
}
```

**Color Scheme**:
- Not pressed: `rgba(128, 128, 128, 0.5)` background, `rgba(255, 255, 255, 0.6)` text
- Pressed: `secondary.main` from theme palette

**Sizes**:
- Badge height: `14px`
- Font size: `8px`
- Icon size: `10px`

## Usage Patterns

### Pattern 1: Simple Component with ShortcutHint Wrapper

**Use when**: Component can be safely wrapped without breaking functionality

```tsx
import { ShortcutHint } from "@kernel/modules/KeyboardShortcuts";

<ShortcutHint shortcutId="file.save" placement="bottom-right">
  <Button>Save</Button>
</ShortcutHint>
```

See: `docs/assets/shortcut-hint-wrapper-example.tsx`

### Pattern 2: Manual Hint Rendering with Exported Styles

**Use when**: Wrapping breaks functionality (e.g., MUI Tabs, Grid items)

**Steps**:
1. Import styles from module
2. Get `showHints` and `pressedKeys` from selectors
3. Track element references for positioning
4. Render hints as absolute-positioned overlays

```tsx
const { keyboardHintContainerSx, keyboardHintKeySx, ... } = 
  keyboardShortcutsModule.styles;

const showHints = useAppSelector(selectShowHints);
const pressedKeys = useAppSelector(selectPressedKeys);

{showHints && (
  <Box sx={{ position: 'absolute', ...keyboardHintContainerSx }}>
    <KeyboardIcon />
    {keyParts.map(part => (
      <Chip sx={pressedKeys.includes(part) ? keyboardHintKeyPressedSx : keyboardHintKeySx} />
    ))}
  </Box>
)}
```

See: `docs/assets/visual-hints-example.tsx` and `src/kernel/modules/Layout/components/RibbonMenu/index.tsx`

### Pattern 3: Dynamic Shortcut Registration

**Use when**: Shortcuts depend on runtime data (e.g., dynamic tabs, list items)

**Steps**:
1. Get keyboard manager from module
2. Create shortcuts in `useEffect` based on data
3. Register shortcuts
4. Cleanup on unmount or data change

```tsx
useEffect(() => {
  if (!data) return;
  
  const shortcuts = data.map((item, index) => ({
    id: `module.action.${item.id}`,
    key: `Alt+${index + 1}`,
    contextId: 'Global',
    action: () => handleAction(item),
  }));
  
  keyboardManager.functions.registerShortcuts(shortcuts);
  
  return () => {
    keyboardManager.functions.unregisterShortcuts(shortcuts.map(s => s.id));
  };
}, [data]);
```

See: `docs/assets/ribbon-menu-example.tsx`

## Naming Conventions

### Shortcut IDs

Format: `<module>.<feature>.<action>[.<identifier>]`

Examples:
- `layout.ribbon.tab.file`
- `layout.ribbon.tab.materials`
- `composer.tool.select`
- `file.save`
- `edit.undo`

### Context IDs

Common contexts:
- `Global`: Available everywhere
- `Modal`: Active only when modal is open
- `Editor`: Active in editor views
- `[ModuleName]`: Module-specific context

## Key Event Normalization Details

### Using `event.code` vs `event.key`

**Problem**: `event.key` can vary by keyboard layout or when modifiers are pressed
- `Alt+1` might produce `≡` on some layouts
- `Alt+a` might produce `å` on international keyboards

**Solution**: Use `event.code` for alphanumeric keys

```typescript
// Number keys
if (event.code && event.code.startsWith('Digit')) {
  key = event.code.replace('Digit', '');  // Digit1 → 1
}

// Letter keys with modifiers
if (event.code && event.code.startsWith('Key') && hasModifiers) {
  key = event.code.replace('Key', '').toLowerCase();  // KeyA → a
}
```

### Modifier-Only Tracking

When only modifiers are pressed (no alphanumeric key), we still track them for visual feedback:

```typescript
if (!key) {
  let keyParts: string[] = [];
  if (event.ctrlKey || event.metaKey) keyParts.push('Ctrl');
  if (event.altKey) keyParts.push('Alt');
  if (event.shiftKey) keyParts.push('Shift');
  
  // Still dispatch for visual feedback
  dispatch(keyPressed(keyParts.join('+'), keyParts, eventDetails));
}
```

## Special Features

### Alt Key Toggle

Pressing and releasing Alt alone toggles hint visibility:

```typescript
// On keydown
if (event.key === 'Alt' && !event.ctrlKey && !event.shiftKey) {
  altAloneRef.current = true;
}

// On keyup
if (event.key === 'Alt' && altAloneRef.current) {
  dispatch(toggleShowHints());
}
```

### Preventing Browser Shortcuts

For registered Alt+Number and Alt+Letter combinations:

```typescript
if (event.altKey && !event.ctrlKey && !event.metaKey) {
  if (event.key >= '1' && event.key <= '9') {
    event.preventDefault();  // Prevent browser tab switching
  }
}
```

## Integration with Micro-Kernel

The module follows the standard `IModule` interface:

```typescript
const module: IKeyboardShortcutsModule = {
  name: 'KeyboardShortcuts',
  version: '0.1.0',
  depends_on: [],
  components: { KeyboardListener, ShortcutProvider, ... },
  managers: { useKeyboardShortcutsManager },
  styles: { keyboardHintContainerSx, ... },
  kernelCalls: { startModule, shutdownModule, ... }
};
```

Modules can access it via:

```typescript
const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
```

## Performance Considerations

1. **Redux Updates**: `pressedKeys` updates on every keypress - components using this selector will re-render
   - Use `useMemo` to prevent unnecessary recalculations
   - Only subscribe to `pressedKeys` if showing visual hints

2. **Element Refs**: Manual hint positioning requires measuring DOM elements
   - Cache measurements when possible
   - Use `requestAnimationFrame` for smooth updates

3. **Shortcut Registration**: Dynamic shortcuts should cleanup properly
   - Always unregister in `useEffect` cleanup
   - Use stable dependency arrays to prevent re-registration

## Future Enhancements

Potential improvements:
- Shortcut conflict detection UI
- Customizable keybindings
- Shortcut cheat sheet modal
- Recording mode for custom shortcuts
- Per-context shortcut priority
- Vim-style command sequences
