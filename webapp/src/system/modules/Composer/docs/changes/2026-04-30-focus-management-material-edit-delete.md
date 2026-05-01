---
id: 2026-04-30-focus-management
name: Focus management for material list shortcuts
description: Ctrl+M focuses the material list; arrows cycle; e/d/a operate on the focused row.
status: planned
modules: [Composer, KeyboardShortcuts]
---

## Context

Today the edit (`e`) and delete (`Shift+m`) shortcuts only fire when a material row already has focus. Reaching that row means tabbing through the accordion or using the mouse — tedious for keyboard-driven users and noisy for MCP agents.

This change introduces a single keyboard-only flow to target a material from anywhere in the model viewport, then act on it.

## Key map

| Key            | Scope                       | Action                                          |
| -------------- | --------------------------- | ----------------------------------------------- |
| `Ctrl+M`       | `Composer/ModelViewport`    | Open Materiais accordion + focus first material |
| `ArrowDown`    | `Composer/MaterialItem`     | Focus next material in the list                 |
| `ArrowUp`      | `Composer/MaterialItem`     | Focus previous material in the list             |
| `e`            | `Composer/MaterialItem`     | Edit the focused material                       |
| `d`            | `Composer/MaterialItem`     | Delete the focused material                     |
| `a`            | `Composer/MaterialItem`     | Add a new material                              |

Notes:

- Arrow / `e` / `d` / `a` are scoped to the `MaterialItem` keyboard context so they only fire while a material row is focused — they must not swallow keys in the graph or in form fields.
- `d` replaces the previous `Shift+m` binding for delete; only the focused-row case is in scope here.
- `a` is the existing add-material shortcut; reused, not redefined.

## MCP tools

Each step is exposed as a separate MCP tool so agents can drive the flow incrementally:

- `focusMaterialList` — presses `Ctrl+M`; asserts the first `[data-testid="material-item"]` is focused.
- `cycleMaterialFocus` — presses `ArrowUp` / `ArrowDown` (direction arg, optional repeat count).
- `selectMaterialByLabel` — given a `label` string, finds the matching `[data-testid="material-item"]` (case-insensitive, exact match preferred, fallback to first label that includes the query) and focuses it. Opens the accordion first if needed. No new keyboard shortcut — agent-only tool that reuses the same focus mechanism as `Ctrl+M`.
- `editFocusedMaterial` — presses `e` while a material is focused.
- `deleteFocusedMaterial` — presses `d` while a material is focused.
- `addMaterial` — existing tool; unchanged.

Each new tool ships with a `*.shortcut.puppeteer.ts` driver and a matching `*.test.ts`, per the mcp-puppeteer-tools conventions.

## ShortcutHint rules

Hints follow the progressive flow so the user sees only the next applicable key:

- **No material focused** — show `Ctrl+M` hint on the Materiais accordion header (the entry point).
- **A material row is focused** — on that row, show row-level hints: `↑` / `↓` for navigation, `e`, `d`, `a`. The `Ctrl+M` hint de-emphasizes (or hides) while focus is inside the list.
- Hints render only on the currently focused row to avoid cluttering the whole list.

## Implementation outline

**Shortcuts** (Composer `kernelCalls.ts`):

```typescript
{
  id: `${MODULE_NAME}/MaterialList/focus`,
  key: 'ctrl+m',
  contextId: `${MODULE_NAME}/ModelViewport`,
  action: () => {
    // Ensure settings panel + Materiais accordion are expanded,
    // then focus the first [data-testid="material-item"].
  },
  description: 'Focus material list',
  enabled: true,
},
{
  id: `${MODULE_NAME}/MaterialItem/focusNext`,
  key: 'ArrowDown',
  contextId: `${MODULE_NAME}/MaterialItem`,
  action: () => { /* focus nextElementSibling material-item */ },
  description: 'Focus next material item',
  enabled: true,
},
{
  id: `${MODULE_NAME}/MaterialItem/focusPrev`,
  key: 'ArrowUp',
  contextId: `${MODULE_NAME}/MaterialItem`,
  action: () => { /* focus previousElementSibling material-item */ },
  description: 'Focus previous material item',
  enabled: true,
},
// e / d / a registered under MaterialItem context
```

**ShortcutHint wiring:**

- Wrap (or render alongside) the Materiais accordion trigger with `<ShortcutHint shortcutId=".../MaterialList/focus" />`.
- On each material row, render the row-level hints gated on `isFocused`.

## Risks

- Arrow keys must be strictly context-scoped; leaking them to the viewport breaks graph pan / scroll.
- `Ctrl+M` should be verified against the Electron host's accelerators (webapp owns the chord, so expected to be fine).
- Long lists still mean multiple arrow presses; acceptable for v1.

## Next steps

- [ ] Register `Ctrl+M` (focus + accordion expand + initial focus).
- [ ] Register `ArrowUp` / `ArrowDown` under `MaterialItem` context.
- [ ] Re-scope / re-register `e`, `d`, `a` under `MaterialItem` context.
- [ ] Add `ShortcutHint` for `Ctrl+M` on the Materiais accordion header.
- [ ] Add row-level `ShortcutHint`s gated on focused state.
- [ ] Add MCP tools `focusMaterialList`, `cycleMaterialFocus`, `selectMaterialByLabel`, `editFocusedMaterial`, `deleteFocusedMaterial` (+ puppeteer drivers + tests).
- [ ] Manual test: full keyboard-only add / edit / delete flow from cold viewport.
