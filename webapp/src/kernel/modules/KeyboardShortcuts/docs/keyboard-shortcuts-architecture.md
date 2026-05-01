# Keyboard Shortcuts Architecture — CRUD Accordion Pattern

A reusable blueprint for keyboard-driven CRUD lists rendered as an accordion: a header that expands a panel, an "add" button, and rows with edit/delete buttons. The Composer's Materiais accordion is the canonical implementation; this document generalizes the pattern so other CRUDs (textures, layers, presets, …) can adopt it without re-deriving the design.

## When this pattern applies

Use it when the surface looks like this:

- An accordion header (or any collapsible container) gates a list.
- The body contains a list of homogeneous rows.
- A single "add" affordance sits near the list (header or footer).
- Each row exposes per-item actions — at minimum **edit** and **delete**.

If the surface diverges (multi-select, drag-reorder, nested lists), treat the pieces below as defaults to override, not rules.

## Design goals

1. **Discoverability** — every binding must ship with a visible `ShortcutHint`. No hidden keys.
2. **Progressive disclosure** — show only the next applicable hint. The entry-key hint disappears once the user is "inside"; row-level hints render only on the focused row.
3. **Strict scoping** — list/row keys never leak to the parent viewport, and never fire while typing in inputs.
4. **MCP parity** — every user-facing step is also an MCP tool, so agents can drive the CRUD the same way a keyboard user would.

## Standard key map

Two keyboard contexts cooperate: the **container context** (where the entry-key fires) and the **row context** (where navigation and per-row actions fire).

| Key         | Context          | Action                                                        |
| ----------- | ---------------- | ------------------------------------------------------------- |
| `Ctrl+<X>`  | container        | Open the accordion + focus the first row                      |
| `ArrowDown` | row              | Focus next row                                                |
| `ArrowUp`   | row              | Focus previous row                                            |
| `e`         | row              | Edit focused row                                              |
| `d`         | row              | Delete focused row                                            |
| `a`         | row (+ container)| Add a new item                                                |
| `Esc`       | row              | Return focus to the container header (optional, recommended)  |

Conventions:

- The entry chord uses `Ctrl+<letter>` where `<letter>` mnemonically matches the resource (`Ctrl+M` → Materiais, `Ctrl+T` → Textures, …). Verify against Electron accelerators before claiming a chord.
- `e` / `d` are the canonical row verbs. Avoid `Shift+<letter>` for destructive actions — bare letters are easier to hint and discover.
- `a` is reusable from either context: in the container before any row is focused, on a row to add without losing place.
- Arrows are list-only. They must not be registered at the container scope — the row context guarantees they don't bleed into the viewport.

## Focus model

- The container header is keyboard-focusable (`tabIndex={0}`). Pressing the entry chord from anywhere in the parent viewport context expands the accordion and moves focus to the first row.
- Each row has `data-testid="<resource>-item"`, `tabIndex={0}`, and pushes the **row context** onto the keyboard stack while focused (`useShortcutContext` or equivalent).
- Arrow handlers move focus via `nextElementSibling` / `previousElementSibling` filtered by the row testid — no index state required, the DOM is the source of truth.
- When the list becomes empty after a delete, focus falls back to the container header (or the "add" button if separate).

## ShortcutHint placement

Follow the progressive-disclosure rule:

- **Container header** — wrap with `<ShortcutHint shortcutId=".../<resource>List/focus" />` for the entry chord. Hide or de-emphasize this hint while focus is inside the list.
- **Focused row only** — render `↑` / `↓`, `e`, `d`, `a` hints. Rows that are not focused show nothing.
- **Add button** — wrap with the `a` hint; this is the one hint that may stay visible alongside the list, since `a` is valid in both container and row contexts.

The default is the wrapper form of `ShortcutHint`. Fall back to manual hint rendering only when wrapping breaks the parent's flex/grid layout (per the KeyboardShortcuts skill decision tree).

## Implementation skeleton

Register shortcuts in the owning module's `kernelCalls.ts`. The two-context split is the load-bearing part — copy it verbatim per resource:

```ts
const RESOURCE = 'Material'; // change per CRUD
const CONTAINER_CTX = `${MODULE_NAME}/ModelViewport`;
const ROW_CTX = `${MODULE_NAME}/${RESOURCE}Item`;

keyboardManager.functions.registerShortcuts([
  {
    id: `${MODULE_NAME}/${RESOURCE}List/focus`,
    key: 'ctrl+m',
    contextId: CONTAINER_CTX,
    action: () => {
      // expand accordion, then focus first [data-testid="material-item"]
    },
    description: `Focus ${RESOURCE} list`,
    enabled: true,
  },
  {
    id: `${MODULE_NAME}/${RESOURCE}Item/focusNext`,
    key: 'ArrowDown',
    contextId: ROW_CTX,
    action: () => { /* focus nextElementSibling */ },
    description: `Focus next ${RESOURCE}`,
    enabled: true,
  },
  {
    id: `${MODULE_NAME}/${RESOURCE}Item/focusPrev`,
    key: 'ArrowUp',
    contextId: ROW_CTX,
    action: () => { /* focus previousElementSibling */ },
    description: `Focus previous ${RESOURCE}`,
    enabled: true,
  },
  // e / d / a registered under ROW_CTX; `a` may also live under CONTAINER_CTX
]);
```

Row component:

```tsx
<div
  data-testid="material-item"
  tabIndex={0}
  ref={rowRef}
  onFocus={() => keyboardManager.functions.pushContext(ROW_CTX)}
  onBlur={() => keyboardManager.functions.popContext(ROW_CTX)}
>
  {label}
  {isFocused && (
    <>
      <ShortcutHint shortcutId={`${MODULE_NAME}/${RESOURCE}Item/edit`} />
      <ShortcutHint shortcutId={`${MODULE_NAME}/${RESOURCE}Item/delete`} />
    </>
  )}
</div>
```

## MCP tool surface

For each CRUD that adopts this pattern, ship the following MCP tools (one tool per user-visible step). Naming uses the resource singular:

- `focus<Resource>List` — fires the entry chord; asserts the first row is focused.
- `cycle<Resource>Focus` — `direction: 'up' | 'down'`, optional repeat count.
- `select<Resource>ByLabel` — focuses a specific row by label match (exact preferred, fallback to `includes`). Opens the accordion if collapsed. Reuses the same focus mechanism — does not register a new shortcut.
- `editFocused<Resource>` — presses `e` while a row is focused.
- `deleteFocused<Resource>` — presses `d`.
- `add<Resource>` — presses `a` (or fires the existing add-tool if one already exists).

Each tool ships with a `*.shortcut.puppeteer.ts` driver and a `*.test.ts`, per the mcp-puppeteer-tools conventions. The driver should `expect` the `data-testid` of the focused row before pressing the action key, so failures are localized.

## Risks and gotchas

- **Arrow leakage.** If arrows are registered at container scope (or globally), they will fight the graph viewport's pan/scroll. Always scope to the row context.
- **Input fields.** The global `shouldIgnoreKeyEvent` check handles inputs, but verify after adding any custom focusable controls inside rows.
- **Electron accelerators.** Confirm `Ctrl+<X>` is not claimed by the host menu before picking it.
- **Accordion already open.** The entry chord must be idempotent: if the panel is open and a row is already focused, re-firing should re-focus the first row, not collapse the panel.
- **Empty list.** Decide up front where focus goes after the last delete (header vs. add button) and document it in the resource's change doc.

## Adoption checklist

When adding this pattern to a new CRUD:

- [ ] Pick the entry chord; verify against Electron accelerators.
- [ ] Define `CONTAINER_CTX` and `ROW_CTX` ids in the module's `kernelCalls.ts`.
- [ ] Register entry, arrows, `e`, `d`, `a` with the contexts above.
- [ ] Add `data-testid="<resource>-item"`, `tabIndex={0}`, and context push/pop on each row.
- [ ] Wrap the container header and add button with `ShortcutHint`. Gate row-level hints on `isFocused`.
- [ ] Add the six MCP tools above (puppeteer drivers + tests).
- [ ] Manual test: full keyboard-only add / edit / delete flow starting from the parent viewport with the panel collapsed.
