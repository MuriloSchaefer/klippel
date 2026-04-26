/**
 * Utility functions for keyboard event handling and normalization
 */

/**
 * Normalizes keyboard events to a standard string format.
 * 
 * Format: [Ctrl+][Alt+][Shift+]Key
 * 
 * Examples:
 * - 'Ctrl+s'
 * - 'Alt+Shift+f'
 * - 'Escape'
 * - 'ArrowDown'
 * 
 * @param event - Browser KeyboardEvent
 * @returns Normalized key string
 */
export function formatKeyEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  
  // Modifier keys in consistent order: Ctrl → Alt → Shift
  // This ensures 'Ctrl+Shift+s' and 'Shift+Ctrl+s' both normalize to 'Ctrl+Shift+s'
  if (event.ctrlKey || event.metaKey) {
    // Treat Cmd (metaKey) on Mac as Ctrl for cross-platform consistency
    parts.push('Ctrl');
  }
  
  if (event.altKey) {
    parts.push('Alt');
  }
  
  if (event.shiftKey) {
    parts.push('Shift');
  }
  
  // Get the actual key pressed
  let key = event.key;
  
  // For number keys, use event.code to avoid issues with Alt+Number producing special characters
  if (event.code && event.code.startsWith('Digit')) {
    key = event.code.replace('Digit', '');
  }
  // For letter keys, use event.code if modifiers are pressed to avoid layout-specific characters
  else if (event.code && event.code.startsWith('Key') && (event.altKey || event.ctrlKey || event.metaKey)) {
    key = event.code.replace('Key', '').toLowerCase();
  }
  
  // Normalize special keys
  switch (key) {
    case ' ':
      key = 'Space';
      break;
    case 'Control':
    case 'Alt':
    case 'Shift':
    case 'Meta':
      // Don't include modifier-only presses
      return '';
    default:
      // Capitalize single letters for consistency
      if (key.length === 1) {
        key = key.toLowerCase();
      }
      break;
  }
  
  parts.push(key);
  
  return parts.join('+');
}

/**
 * Checks if a keyboard event should be ignored (e.g., when typing in an input field)
 * 
 * @param event - Browser KeyboardEvent
 * @returns true if the event should be ignored
 */
export function shouldIgnoreKeyEvent(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  
  // Ignore events from input elements
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  ) {
    // Allow Escape, Tab, and Ctrl+Enter (confirm) even in inputs
    if (event.key === 'Escape' || event.key === 'Tab') {
      return false;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Parses a shortcut string into its components
 * 
 * @param shortcut - Shortcut string (e.g., 'Ctrl+Shift+s')
 * @returns Object with modifier flags and key
 */
export function parseShortcut(shortcut: string): {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
} {
  const parts = shortcut.split('+');
  
  return {
    ctrl: parts.includes('Ctrl'),
    alt: parts.includes('Alt'),
    shift: parts.includes('Shift'),
    key: parts[parts.length - 1],
  };
}

/**
 * Checks if two shortcuts are equivalent
 * 
 * @param shortcut1 - First shortcut string
 * @param shortcut2 - Second shortcut string
 * @returns true if shortcuts are equivalent
 */
export function areShortcutsEqual(shortcut1: string, shortcut2: string): boolean {
  return shortcut1.toLowerCase() === shortcut2.toLowerCase();
}
