# Utils Design

This folder contains utility functions for the KeyboardShortcuts module.

## Overview

Utilities provide helper functions for:
- Normalizing keyboard events
- Formatting key strings
- Comparing key combinations
- Validating shortcut definitions

## Files

- `formatKeyEvent.ts` - Normalize keyboard events to string format

## formatKeyEvent Utility

Normalize keyboard events into consistent key strings:

```typescript
// utils/formatKeyEvent.ts
export function formatKeyEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  
  // Add modifiers in consistent order
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  
  // Normalize key
  let key = event.key;
  if (key === ' ') {
    key = 'Space';
  } else if (key.length === 1) {
    key = key.toLowerCase();
  }
  
  parts.push(key);
  
  return parts.join('+');
}

// Examples:
// Ctrl + S → 'Ctrl+s'
// W → 'w'
// Shift + Alt + Q → 'Shift+Alt+q'
// Space → 'Space'
```

## Usage Examples

### In KeyboardListener

```typescript
import { formatKeyEvent } from '../utils/formatKeyEvent';

const handleKeyDown = (event: KeyboardEvent) => {
  const key = formatKeyEvent(event);
  
  dispatch(keyPressed({
    key,
    originalEvent: event,
    timestamp: Date.now()
  }));
};
```

### In Tests

```typescript
import { formatKeyEvent } from './formatKeyEvent';

describe('formatKeyEvent', () => {
  it('formats single key', () => {
    const event = new KeyboardEvent('keydown', { key: 'q' });
    expect(formatKeyEvent(event)).toBe('q');
  });
  
  it('formats Ctrl+key', () => {
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
    expect(formatKeyEvent(event)).toBe('Ctrl+s');
  });
  
  it('formats multi-modifier combination', () => {
    const event = new KeyboardEvent('keydown', { 
      key: 'q', 
      shiftKey: true, 
      altKey: true 
    });
    expect(formatKeyEvent(event)).toBe('Shift+Alt+q');
  });
  
  it('normalizes space key', () => {
    const event = new KeyboardEvent('keydown', { key: ' ' });
    expect(formatKeyEvent(event)).toBe('Space');
  });
});
```

## Key Normalization Rules

### Modifier Order

Modifiers are always added in this order:
1. `Ctrl` (or `Cmd` on Mac)
2. `Alt`
3. `Shift`

This ensures consistent string representation regardless of the order keys were pressed.

### Key Normalization

| Input | Output | Reason |
|-------|--------|--------|
| `'q'` | `'q'` | Lowercase single characters |
| `'Q'` | `'q'` | Normalize to lowercase |
| `' '` | `'Space'` | Named key for space |
| `'Enter'` | `'Enter'` | Special keys preserved |
| `'Escape'` | `'Escape'` | Special keys preserved |
| `'ArrowUp'` | `'ArrowUp'` | Arrow keys preserved |

### Platform Differences

| Windows/Linux | Mac | Normalized |
|---------------|-----|------------|
| `Ctrl` | `Cmd` (⌘) | `Ctrl` |
| `Alt` | `Option` (⌥) | `Alt` |
| `Shift` | `Shift` | `Shift` |

The utility normalizes `event.metaKey` (Mac Cmd) to `Ctrl` for consistency.

## Additional Utilities (Future)

### parseKeyString

Parse a string back into modifier flags:

```typescript
export interface ParsedKey {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

export function parseKeyString(keyString: string): ParsedKey {
  const parts = keyString.split('+');
  
  return {
    ctrl: parts.includes('Ctrl'),
    alt: parts.includes('Alt'),
    shift: parts.includes('Shift'),
    key: parts[parts.length - 1]
  };
}

// Example:
parseKeyString('Ctrl+Shift+q')
// { ctrl: true, alt: false, shift: true, key: 'q' }
```

### isModifierOnly

Check if event is only a modifier key:

```typescript
export function isModifierOnly(event: KeyboardEvent): boolean {
  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta'];
  return modifierKeys.includes(event.key);
}
```

### compareKeys

Compare two key strings for equality:

```typescript
export function compareKeys(key1: string, key2: string): boolean {
  const normalize = (key: string) => 
    key.split('+').map(k => k.toLowerCase()).sort().join('+');
  
  return normalize(key1) === normalize(key2);
}

// Example:
compareKeys('Ctrl+s', 'ctrl+S') // true
compareKeys('Shift+Ctrl+q', 'Ctrl+Shift+q') // true
```

## Best Practices

### Consistency

1. **Always use formatKeyEvent** - Don't manually construct key strings
2. **Single source of truth** - All key normalization goes through this utility
3. **Test edge cases** - Special keys, modifiers, international keyboards

### Performance

1. **Don't format in loops** - Format once when event occurs
2. **Cache if needed** - Store formatted string in state/props
3. **Minimal allocations** - Function is optimized for frequent calls

### Cross-Platform

1. **Test on multiple OS** - Especially Mac vs Windows/Linux
2. **Document differences** - Note platform-specific behavior
3. **Use feature detection** - Check for `event.metaKey` support

### Internationalization

1. **Handle international keyboards** - Test with non-US layouts
2. **Special characters** - Document behavior for accented letters
3. **Right-to-left** - Ensure consistent behavior for RTL languages
