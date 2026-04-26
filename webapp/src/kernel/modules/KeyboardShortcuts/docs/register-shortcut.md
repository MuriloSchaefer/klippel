# LLM Skill: Adding Keyboard Shortcuts to Components

## Task Description

This document provides step-by-step instructions for adding keyboard shortcut support to any component in the Klippel application. Follow this guide when integrating the KeyboardShortcuts module with new or existing components.

## Prerequisites

- Component is within the Klippel webapp React application
- KeyboardShortcuts module is available (`@kernel/modules/KeyboardShortcuts`)
- Component can import `useModule` hook

## Decision Tree: Which Approach to Use?

### Use ShortcutHint Wrapper Component When:
- ✅ Component is a simple wrapper-safe element (Button, Box, IconButton)
- ✅ Wrapping the component doesn't break parent functionality
- ✅ You want minimal code

### Use Manual Hint Rendering When:
- ✅ Component is part of a parent system (MUI Tabs, Grid, List)
- ✅ Wrapping breaks functionality (e.g., Tab indicator)
- ✅ You need precise control over hint positioning
- ✅ Component has dynamic positioning requirements

## Approach 1: Using ShortcutHint Wrapper (Simple)

### Step 1: Import Dependencies

```typescript
import useModule from "@kernel/hooks/useModule";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";
```

### Step 2: Get ShortcutHint Component

```typescript
const MyComponent = () => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcuts.components;
  
  // ... rest of component
};
```

### Step 3: Register Your Shortcut

```typescript
import { useEffect } from 'react';

const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();

useEffect(() => {
  keyboardManager.functions.registerShortcuts([{
    id: 'module.feature.action',        // Follow naming convention
    key: 'Ctrl+s',                       // Keyboard combination
    description: 'Save document',        // Human-readable
    contextId: 'Global',                 // Or specific context
    action: () => handleSave(),          // Your action function
    enabled: true,
  }]);
  
  return () => {
    keyboardManager.functions.unregisterShortcuts(['module.feature.action']);
  };
}, []);
```

### Step 4: Wrap Your Component

```typescript
return (
  <ShortcutHint 
    shortcutId="module.feature.action"
    placement="bottom-right"
  >
    <Button onClick={handleSave}>
      Save
    </Button>
  </ShortcutHint>
);
```

### Complete Example

See: `docs/assets/shortcut-hint-wrapper-example.tsx`

## Approach 2: Manual Hint Rendering (Advanced)

Use this approach for components like MUI Tabs, where wrapping breaks functionality.

### Step 1: Import Dependencies

```typescript
import React, { useRef } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";
import { 
  selectShowHints, 
  selectPressedKeys 
} from "@kernel/modules/KeyboardShortcuts/store/selectors";
```

### Step 2: Setup Module Access and State

```typescript
const MyComponent = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  
  // Import styles
  const { 
    keyboardHintContainerSx,
    keyboardHintKeySx,
    keyboardHintKeyPressedSx,
    keyboardHintSeparatorSx,
  } = keyboardShortcuts.styles;
  
  // Get global state
  const showHints = useAppSelector(selectShowHints);
  const pressedKeys = useAppSelector(selectPressedKeys);
  
  // Track element references for positioning
  const elementRefs = useRef<Record<string, HTMLElement | null>>({});
};
```

### Step 3: Register Shortcuts

```typescript
useEffect(() => {
  const shortcuts = [
    {
      id: 'module.action.item1',
      key: 'Alt+1',
      description: 'Select item 1',
      contextId: 'Global',
      action: () => handleSelect('item1'),
      enabled: true,
    },
    // ... more shortcuts
  ];
  
  keyboardManager.functions.registerShortcuts(shortcuts);
  
  return () => {
    keyboardManager.functions.unregisterShortcuts(shortcuts.map(s => s.id));
  };
}, []);
```

### Step 4: Render Your Component with Refs

```typescript
return (
  <Box sx={{ position: 'relative' }}>
    {/* Your component - add refs to track positions */}
    <Tab
      ref={(el) => {
        elementRefs.current['item1'] = el;
      }}
      label="Item 1"
    />
    
    {/* Render hints as overlays */}
    {renderHints()}
  </Box>
);
```

### Step 5: Implement Hint Rendering Function

```typescript
const renderHints = () => {
  if (!showHints) return null;
  
  return Object.entries(items).map(([id, item]) => {
    const shortcutKey = getShortcutKeyForItem(item);  // e.g., "Alt+1"
    const keyParts = shortcutKey.split('+');
    const isPressed = keyParts.some(part => pressedKeys.includes(part));
    const element = elementRefs.current[id];
    
    if (!element) return null;
    
    return (
      <Box
        key={`hint-${id}`}
        sx={{
          position: 'absolute',
          ...keyboardHintContainerSx,
          pointerEvents: 'none',
          zIndex: 10,
        }}
        style={{
          // Calculate position based on element
          left: `${element.offsetLeft + element.offsetWidth - 60}px`,
          top: `${element.offsetTop + element.offsetHeight - 15}px`,
        }}
      >
        <KeyboardIcon
          sx={{
            fontSize: '10px',
            color: isPressed ? 'secondary.main' : 'rgba(255, 255, 255, 0.4)',
            transition: 'color 0.1s ease-in-out',
          }}
        />
        {keyParts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <Box component="span" sx={keyboardHintSeparatorSx}>
                +
              </Box>
            )}
            <Chip
              label={part}
              size="small"
              sx={
                pressedKeys.includes(part)
                  ? keyboardHintKeyPressedSx
                  : keyboardHintKeySx
              }
            />
          </React.Fragment>
        ))}
      </Box>
    );
  });
};
```

### Complete Example

See: 
- `docs/assets/visual-hints-example.tsx`
- `src/kernel/modules/Layout/components/RibbonMenu/index.tsx` (real implementation)

## Dynamic Shortcuts Pattern

For components with dynamic data (e.g., tabs, list items):

### Step 1: Map Data to Shortcuts

```typescript
useEffect(() => {
  if (!items) return;
  
  const shortcuts = items.map((item, index) => ({
    id: `module.feature.${item.id}`,
    key: `Alt+${index + 1}`,
    description: `Select ${item.name}`,
    contextId: 'Global',
    action: () => handleItemAction(item),
    enabled: true,
  }));
  
  keyboardManager.functions.registerShortcuts(shortcuts);
  
  return () => {
    const shortcutIds = shortcuts.map(s => s.id);
    keyboardManager.functions.unregisterShortcuts(shortcutIds);
  };
}, [items, keyboardManager]);  // Re-register when data changes
```

See: `docs/assets/ribbon-menu-example.tsx`

## Naming Conventions

### Shortcut ID Format

`<module>.<feature>.<action>[.<identifier>]`

Examples:
- `layout.ribbon.tab.file` - Layout module, ribbon menu, tab selection, file tab
- `composer.tool.select` - Composer module, tool selection
- `materials.item.edit` - Materials module, item editing

### Key Combination Format

- Modifiers: `Ctrl`, `Alt`, `Shift` (in that order)
- Always use `+` separator
- Single letters lowercase: `Ctrl+s`
- Numbers as-is: `Alt+1`
- Special keys capitalized: `Escape`, `Enter`, `Space`

Valid examples:
- `Ctrl+s`
- `Alt+Shift+f`
- `Ctrl+Alt+Delete`
- `Alt+1`
- `Escape`

### Context ID Format

- `Global` - Available everywhere
- `[ModuleName]` - Module-specific (e.g., `Composer`, `Materials`)
- `Modal` - Active in modals only
- `Editor` - Active in editor contexts

## Common Patterns

### Pattern: Toolbar Button with Shortcut

```typescript
const ToolbarButton = ({ label, icon, action, shortcutKey }) => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcuts.components;
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  
  useEffect(() => {
    keyboardManager.functions.registerShortcuts([{
      id: `toolbar.${label.toLowerCase()}`,
      key: shortcutKey,
      description: label,
      contextId: 'Global',
      action: action,
    }]);
    
    return () => {
      keyboardManager.functions.unregisterShortcuts([`toolbar.${label.toLowerCase()}`]);
    };
  }, []);
  
  return (
    <ShortcutHint shortcutId={`toolbar.${label.toLowerCase()}`}>
      <IconButton onClick={action}>
        {icon}
      </IconButton>
    </ShortcutHint>
  );
};
```

### Pattern: Context-Specific Shortcuts

```typescript
const ModalComponent = () => {
  const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const { ShortcutProvider } = keyboardShortcuts.components;
  const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
  
  useEffect(() => {
    keyboardManager.functions.registerShortcuts([{
      id: 'modal.close',
      key: 'Escape',
      description: 'Close modal',
      contextId: 'Modal',  // Only active in Modal context
      action: () => handleClose(),
    }]);
    
    return () => {
      keyboardManager.functions.unregisterShortcuts(['modal.close']);
    };
  }, []);
  
  return (
    <ShortcutProvider contextId="Modal">
      {/* Escape shortcut only active within this provider */}
      <Dialog>
        {/* ... */}
      </Dialog>
    </ShortcutProvider>
  );
};
```

## Troubleshooting

### Shortcut Not Triggering

**Check**:
1. Is shortcut registered? Check Redux DevTools for `shortcuts` state
2. Is context active? Check `contextStack` in Redux state
3. Is shortcut enabled? Check `enabled` flag
4. Is global shortcuts enabled? Check `enabled` in Redux state
5. Are you typing in an input field? Shortcuts are ignored in inputs (except Escape/Tab)

### Visual Hints Not Appearing

**Check**:
1. Is `showHints` true? Press Alt to toggle
2. Is shortcut registered with correct ID?
3. Is placement causing hint to render off-screen?
4. For manual rendering: is `elementRef.current` populated?

### Wrapping Component Breaks Functionality

**Solution**: Use manual hint rendering approach (Approach 2)

Examples: MUI Tabs, Grid items, custom layout components

### Keys Not Highlighting When Pressed

**Check**:
1. Is `pressedKeys` being updated? Check Redux DevTools
2. Is key normalization correct? Check console logs
3. Are you comparing the right key format? (e.g., `Alt` vs `alt`)

## Best Practices

1. **Always cleanup shortcuts**: Unregister in useEffect cleanup
2. **Use stable shortcut IDs**: Don't generate IDs dynamically
3. **Follow naming conventions**: Keep IDs predictable and searchable
4. **Provide descriptions**: Help users understand what shortcuts do
5. **Don't override browser shortcuts**: Avoid `Ctrl+t`, `Ctrl+w`, etc.
6. **Test on different keyboards**: Use `event.code` pattern (already implemented)
7. **Consider accessibility**: Shortcuts should complement, not replace, UI controls
8. **Use appropriate contexts**: Don't register everything in Global
9. **Document your shortcuts**: Add to module README if adding many shortcuts

## Testing Checklist

- [ ] Shortcut triggers the correct action
- [ ] Shortcut appears in Redux state when registered
- [ ] Shortcut is removed from Redux state on unmount
- [ ] Visual hint appears when global hints enabled
- [ ] Visual hint highlights when keys pressed
- [ ] Visual hint respects placement prop
- [ ] Works on different keyboard layouts
- [ ] Doesn't interfere with typing in input fields
- [ ] Doesn't conflict with existing shortcuts

## Reference Files

- Architecture: `docs/architecture.md`
- Simple example: `docs/assets/shortcut-hint-wrapper-example.tsx`
- Manual example: `docs/assets/visual-hints-example.tsx`
- Dynamic example: `docs/assets/ribbon-menu-example.tsx`
- Real implementation: `src/kernel/modules/Layout/components/RibbonMenu/index.tsx`

## Quick Reference

### Import Statements

```typescript
import useModule from "@kernel/hooks/useModule";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { selectShowHints, selectPressedKeys } from "@kernel/modules/KeyboardShortcuts/store/selectors";
```

### Get Module

```typescript
const keyboardShortcuts = useModule<KeyboardShortcuts>("KeyboardShortcuts");
const { ShortcutHint } = keyboardShortcuts.components;
const keyboardManager = keyboardShortcuts.managers.useKeyboardShortcutsManager();
const { keyboardHintContainerSx, ... } = keyboardShortcuts.styles;
```

### Register Shortcut

```typescript
keyboardManager.functions.registerShortcuts([{
  id: 'module.feature.action',
  key: 'Ctrl+s',
  description: 'Description',
  contextId: 'Global',
  action: () => doAction(),
  enabled: true,
}]);
```

### Unregister Shortcut

```typescript
keyboardManager.functions.unregisterShortcuts(['module.feature.action']);
```

## Support

For questions or issues:
1. Check `docs/architecture.md` for detailed architecture
2. Review example files in `docs/assets/`
3. Inspect working implementation in RibbonMenu
4. Check Redux DevTools for state inspection
