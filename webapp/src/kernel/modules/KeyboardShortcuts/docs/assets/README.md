# KeyboardShortcuts Examples

This folder contains example implementations demonstrating different patterns for integrating keyboard shortcuts into components.

## Examples

### 1. `ribbon-menu-example.tsx`
**Pattern**: Dynamic shortcut registration with runtime data

**Demonstrates**:
- Registering shortcuts based on dynamic component state (tabs)
- Using shortcut IDs with identifiers (`layout.ribbon.tab.${name}`)
- Cleanup on component unmount
- Re-registration when data changes

**Use this when**: Your shortcuts depend on runtime data (lists, tabs, dynamic content)

---

### 2. `visual-hints-example.tsx`
**Pattern**: Manual hint rendering with exported styles

**Demonstrates**:
- Importing and using style objects from KeyboardShortcuts module
- Manual positioning of hint badges
- Responding to `pressedKeys` state for visual feedback
- Rendering hints as absolute-positioned overlays

**Use this when**: 
- Wrapping with `ShortcutHint` breaks functionality (e.g., MUI Tabs)
- You need precise control over hint positioning
- Component has complex layout requirements

---

### 3. `shortcut-hint-wrapper-example.tsx`
**Pattern**: Simple wrapper component approach

**Demonstrates**:
- Using the `ShortcutHint` component
- Different placement options
- `alwaysShow` prop for persistent hints
- Minimal code approach

**Use this when**: 
- Component can be safely wrapped
- You want the simplest implementation
- Standard positioning is sufficient

---

## Which Example Should I Follow?

```
┌─────────────────────────────────────────────┐
│ Can you wrap your component?                │
└────────────┬────────────────────────────────┘
             │
        Yes  │  No
             │
    ┌────────▼────────┐         ┌──────────────────────────┐
    │ Static data?    │         │ Use visual-hints-example │
    └────────┬────────┘         │ (Manual rendering)       │
             │                  └──────────────────────────┘
        Yes  │  No
             │
┌────────────▼──────────┐    ┌──────────────────────────┐
│ shortcut-hint-wrapper │    │ ribbon-menu-example      │
│ (Simple wrapper)      │    │ (Dynamic registration)   │
└───────────────────────┘    └──────────────────────────┘
```

## Real-World Implementation

See `/home/schaefer/Documents/personal/klippel/webapp/src/kernel/modules/Layout/components/RibbonMenu/index.tsx` for a production implementation combining:
- Dynamic shortcut registration
- Manual hint rendering
- Element ref tracking
- Absolute positioning

## File Structure

```
assets/
├── README.md                           (this file)
├── ribbon-menu-example.tsx             (Dynamic registration pattern)
├── visual-hints-example.tsx            (Manual rendering pattern)
└── shortcut-hint-wrapper-example.tsx   (Simple wrapper pattern)
```

## Related Documentation

- `../architecture.md` - Full architecture and design patterns
- `../register-shortcut.md` - Step-by-step LLM skill guide

## Notes

These are **example files only** - they are not imported or used by the application. They serve as reference implementations and copyable patterns.

When implementing keyboard shortcuts in your module:
1. Choose the appropriate pattern
2. Copy the relevant code
3. Adapt to your specific use case
4. Follow the naming conventions in `register-shortcut.md`
