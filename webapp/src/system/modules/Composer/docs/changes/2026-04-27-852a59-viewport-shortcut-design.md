---
id: 2026-04-27-852a59
name: Composer viewport shortcut design
description: Keyboard shortcut design for Composer model-edit operations, scoped exclusively to the active viewport.
status: draft
modules: [Composer]
---

## Context
Composer model-edit operations (add material, rename, add graduation, add visualization, switch view between graph and SVG) need a fast, keyboard-first control path. To keep the binding surface predictable and avoid collisions with panel inputs and app chrome, **all Composer shortcuts are scoped to the active viewport only** — they fire only when the active viewport has focus, and never while a settings/details panel input or other surface holds focus.

## Change
- **Scope**: every shortcut defined here is registered against a single `Composer.Viewport` context. The context is activated when a viewport becomes the active/focused surface and deactivated otherwise. There are no panel-scoped or app-global Composer bindings.
- **Target**: actions apply to the currently selected entity inside the active viewport.
- **Suppression**: while focus is in any text input, settings panel, or details panel, the Composer.Viewport context is inactive and no Composer shortcut fires.
- **Discoverability**: `ShortcutHint` (from the KeyboardShortcuts module) **must always be rendered** next to every actionable viewport control that has a shortcut — no shortcut ships without a visible hint. The hints overlay also shows only the active-viewport bindings.

### Cheat sheet — Composer model edit operations (active viewport only)

Design rules:
- Prefer a single key. Combinations allowed when needed, capped at **3 keys** (e.g. `Ctrl+Shift+m`, or a chord like `g m`).
- Mnemonic first: pick the first letter of the action noun/verb when free.
- Shift-variant of the same key is reserved for the inverse/remove form (e.g. `m` add material, `M` remove material). When Shift is unavailable, fall back to a 2-key combo with `Alt` or a chord prefix.
- Reserve `Ctrl`/`Cmd` combos for destructive actions; plain letters stay for in-viewport edits.
- Arrows / `Tab` are reserved for focus traversal and never rebound.

| Key | Action                          |
|-----|---------------------------------|
| `m` | Add material                    |
| `M` | Remove material                 |
| `r` | Rename (change name)            |
| `g` | Add graduation                  |
| `G` | Remove graduation               |
| `v` | Add visualization               |
| `V` | Remove visualization            |
| `1` | View as graph                   |
| `2` | View as SVG                     |
| `Esc` | Cancel current edit / drop focus back to viewport |

Reserved / do-not-bind: `Tab`/`Shift+Tab` (focus), `Space` (pointer pan), `Enter` (confirm), arrow keys (selection nav).

### Implementation requirement

All shortcut wiring **must** go through the `KeyboardShortcuts` kernel module — do not register native `keydown` listeners or build a parallel registry inside Composer.

Reference: [KeyboardShortcuts skill](../../../../../kernel/modules/KeyboardShortcuts/docs/skills/SKILL.md), [register-shortcut guide](../../../../../kernel/modules/KeyboardShortcuts/docs/register-shortcut.md), and [ERGONOMIC_LAYOUT.md](../../../../../kernel/modules/KeyboardShortcuts/ERGONOMIC_LAYOUT.md).

Each action is registered via `keyboardManager.functions.registerShortcuts([...])` with:
- `id`: `composer.viewport.<action>` (e.g. `composer.viewport.addMaterial`, `composer.viewport.viewAsGraph`).
- `key`: the binding from the cheat sheet (uppercase variants registered as the Shift form per the module's key syntax).
- `contextId`: `Composer.Viewport` for **all** Composer shortcuts. The context is activated/deactivated by the active-viewport focus tracker so suppression is enforced by the module, not by per-handler guards.
- `description`: matches the cheat-sheet label so `ShortcutHint` and the hints overlay render the same text.

Files expected to change:
- `Composer/constants.ts` — `Composer.Viewport` context id and shortcut id constants.
- `Composer/hooks/` — hook that activates `Composer.Viewport` when a viewport becomes active/focused and deactivates it on blur.
- `Composer/components/` — wrap actionable controls with `ShortcutHint` (or manual hint rendering where wrapping breaks layout, per the skill's decision tree); register shortcuts in `useEffect` and unregister on unmount.
- `Composer/mcpTools/` — MCP shortcut tools delegate to the same registered shortcut ids so the MCP path and the keyboard path share one source of truth.

## Status notes
Draft — open questions:
- Multi-viewport workspaces: confirm "active viewport" semantics — single global activation, or per-viewport context instances keyed by viewport id.
- How `Esc` interacts with an in-flight rename input vs. a no-op selection state.
- Locale: single-letter mnemonics assume QWERTY; confirm policy for non-Latin layouts.

## Security
None. Shortcuts dispatch existing in-app actions through the same kernel calls already exposed; no new surface is introduced and no privilege boundary is crossed.

## Performance
Negligible. Registration is O(1) per shortcut and dispatch goes through the existing KeyboardShortcuts manager. The only added cost is a focus listener that toggles the `Composer.Viewport` context.
