# KeyboardShortcuts Module Documentation

Complete documentation for the KeyboardShortcuts module, including architecture, patterns, and integration guides.

## Documentation Files

### 📐 [architecture.md](./architecture.md)
**Comprehensive module architecture documentation**

Contains:
- Core component descriptions (KeyboardListener, ShortcutProvider, ShortcutHint)
- Redux state structure and management
- Middleware flow
- Exported styles and their usage
- Usage patterns
- Key normalization details
- Performance considerations
- Integration points

**Read this to**: Understand how the module works internally, architectural decisions, and available APIs.

---

### 🛠️ [register-shortcut.md](./register-shortcut.md)
**LLM skill file: Step-by-step guide for adding shortcuts to components**

Contains:
- Decision tree for choosing the right approach
- Approach 1: ShortcutHint wrapper (simple)
- Approach 2: Manual hint rendering (advanced)
- Dynamic shortcuts pattern
- Naming conventions
- Common patterns
- Troubleshooting guide
- Testing checklist
- Quick reference

**Read this to**: Learn how to add keyboard shortcuts to your components, with copy-paste examples.

---

### 📁 [assets/](./assets/)
**Example implementations folder**

Contains:
- `ribbon-menu-example.tsx` - Dynamic shortcut registration
- `visual-hints-example.tsx` - Manual hint rendering
- `shortcut-hint-wrapper-example.tsx` - Simple wrapper approach
- `README.md` - Guide to choosing the right example

**Use this to**: Find copyable code examples for common integration patterns.

---

## Quick Start

### For Users (Understanding the Feature)

1. **Toggle keyboard hints**: Press `Alt` key alone
2. **Use shortcuts**: When hints are visible, press the shown key combinations
3. **Example**: Press `Alt+1` to switch to the first tab in the ribbon menu

### For Developers (Adding Shortcuts)

1. **Read**: [register-shortcut.md](./register-shortcut.md) - Start here
2. **Choose**: Pick the right pattern from the decision tree
3. **Copy**: Use examples from [assets/](./assets/)
4. **Implement**: Follow the step-by-step guide
5. **Test**: Use the testing checklist

### For Maintainers (Understanding Design)

1. **Read**: [architecture.md](./architecture.md) - Complete technical overview
2. **Understand**: Flow from KeyboardListener → Redux → Middleware → Action
3. **Extend**: Follow established patterns for new features

## Module Capabilities

### ✅ What This Module Provides

- ✅ Global keyboard event capture
- ✅ Context-based shortcut scoping
- ✅ Visual hint badges with keyboard icon
- ✅ Pressed key visual feedback (color changes)
- ✅ Alt-key toggle for hints
- ✅ Dynamic shortcut registration
- ✅ Keyboard layout independence (uses `event.code`)
- ✅ Browser shortcut prevention
- ✅ Input field awareness (ignores typing)
- ✅ Reusable style exports
- ✅ Redux state management
- ✅ TypeScript typed APIs

### ❌ What This Module Does NOT Provide

- ❌ Shortcut conflict resolution UI
- ❌ User-customizable keybindings
- ❌ Shortcut cheat sheet modal (just visual hints)
- ❌ Shortcut recording interface
- ❌ Vim-style command sequences
- ❌ Undo/redo for shortcut changes

## File Structure

```
KeyboardShortcuts/
├── components/
│   ├── KeyboardListener.tsx          # Global event capture
│   ├── ShortcutProvider.tsx          # Context scoping
│   ├── ShortcutHint.tsx             # Visual hint wrapper
│   └── KeyboardShortcutsTrayIcon.tsx # Tray toggle icon
├── store/
│   ├── state.ts                      # Redux state interface
│   ├── slice.ts                      # Redux slice
│   ├── actions.ts                    # Redux actions
│   ├── selectors.ts                  # Redux selectors
│   └── middleware.ts                 # Shortcut matching logic
├── managers/
│   └── keyboardManager.ts            # Registration API
├── utils/
│   ├── formatKeyEvent.ts             # Key normalization
│   └── keyboardHintStyles.ts         # Reusable styles
├── docs/
│   ├── README.md                     # This file
│   ├── architecture.md               # Technical documentation
│   ├── register-shortcut.md          # Integration guide
│   └── assets/                       # Example implementations
└── index.ts                          # Module export
```

## Common Workflows

### Adding a Simple Button Shortcut

1. Import: `const { ShortcutHint } = useModule<KeyboardShortcuts>("KeyboardShortcuts").components`
2. Register: Use `keyboardManager.functions.registerShortcuts([...])`
3. Wrap: `<ShortcutHint shortcutId="..."><Button /></ShortcutHint>`

See: [assets/shortcut-hint-wrapper-example.tsx](./assets/shortcut-hint-wrapper-example.tsx)

### Adding Shortcuts to Complex Layouts (MUI Tabs, etc.)

1. Import styles: `const { keyboardHintContainerSx, ... } = module.styles`
2. Track refs: `const refs = useRef<Record<string, HTMLElement>>({})`
3. Register shortcuts dynamically
4. Render hints manually as overlays

See: [assets/visual-hints-example.tsx](./assets/visual-hints-example.tsx)

### Debugging Shortcuts

1. Open Redux DevTools
2. Check `KeyboardShortcuts` state slice
3. Look at `shortcuts` - is yours registered?
4. Check `contextStack` - is your context active?
5. Check `pressedKeys` - are keys being captured?
6. Check `showHints` - are hints enabled?

## API Reference

### Manager API

```typescript
const keyboardManager = useModule<KeyboardShortcuts>("KeyboardShortcuts")
  .managers.useKeyboardShortcutsManager();

// Register shortcuts
keyboardManager.functions.registerShortcuts(shortcuts: Shortcut[]);

// Unregister shortcuts
keyboardManager.functions.unregisterShortcuts(shortcutIds: string[]);
```

### Components

```typescript
const { 
  KeyboardListener,          // Mount once in App.tsx
  ShortcutProvider,          // Wrap for context scoping
  ShortcutHint,             // Wrap for visual hints
  KeyboardShortcutsTrayIcon // Tray toggle
} = useModule<KeyboardShortcuts>("KeyboardShortcuts").components;
```

### Styles

```typescript
const { 
  keyboardHintContainerSx,    // Badge container
  keyboardHintKeySx,          // Key (not pressed)
  keyboardHintKeyPressedSx,   // Key (pressed)
  keyboardHintSeparatorSx,    // '+' separator
  keyboardHintWrapperSx,      // Wrapper
  getBadgePosition,           // Position helper
  KEYBOARD_HINT_WRAPPER_CLASS // CSS class
} = useModule<KeyboardShortcuts>("KeyboardShortcuts").styles;
```

### Selectors

```typescript
import { 
  selectShowHints,      // boolean: hints visible?
  selectPressedKeys,    // string[]: currently pressed
  selectShortcutById,   // (id) => Shortcut | undefined
  selectActiveShortcuts // Record<string, Shortcut>
} from "@kernel/modules/KeyboardShortcuts/store/selectors";
```

## Contributing

When making changes to this module:

1. **Update architecture.md** if you change core behavior
2. **Update register-shortcut.md** if you change integration patterns
3. **Add examples** to assets/ for new patterns
4. **Update this README** if you add new files or capabilities
5. **Follow TypeScript conventions** (see copilot-instructions.md)
6. **Test on different keyboards** to ensure layout independence

## Support

- 📖 Start with: [register-shortcut.md](./register-shortcut.md)
- 🔍 Deep dive: [architecture.md](./architecture.md)
- 💡 Examples: [assets/](./assets/)
- 🐛 Debugging: Check Redux DevTools → KeyboardShortcuts slice
