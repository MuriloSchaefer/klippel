---
name: mcp-puppeteer-tools
description: Use when adding, modifying, or testing MCP tools that drive the Klippel UI via Puppeteer — including writing/refactoring `mcpTools/*.ts`, creating `<Component>.click.puppeteer.ts` / `<Component>.shortcut.puppeteer.ts` drivers, registering keyboard shortcuts that ship with `ShortcutHint`, extracting helpers under `electron/main/mcp/helpers/`, and authoring the matching `*.test.ts`. Triggers: "add an MCP tool", "wire up a shortcut", "write a puppeteer driver", "refactor addMaterial", "add a tool test".
---

# Klippel MCP + Puppeteer tools

This skill captures the conventions for the MCP server, its Puppeteer drivers, the paired click/shortcut tool variants, and the Jest harness that runs them against a live dev Electron. The authoritative long-form docs are [webapp/src/docs/mcp-server.md](../../../webapp/src/docs/mcp-server.md) and [webapp/src/docs/mcp-tool-reuse.md](../../../webapp/src/docs/mcp-tool-reuse.md) — read those when in doubt. This file is the working summary you apply by default.

## Ownership model (modules own their tools)

- `electron/main/mcp/index.ts` is a bootstrapper. It must not contain per-tool zod schemas or DOM logic.
- Each module exposes its tools through `mcpTools/index.ts` exporting `registerMcpTools(server)`. The root `McpServer` is constructed in `electron/main/mcp/index.ts` and handed to every module.
- Tool tests live next to the tool: `mcpTools/<tool>.test.ts`. There is no top-level test harness for tools.
- The MCP SDK only allows one `McpServer` per stdio transport, so `registerMcpTools(server)` is the per-module "sub-server" — that function is the boundary.

## Paired tools: `<action>` + `<action>Shortcut`

Every interactive feature ships two tools with the same observable outcome:

| File | Tool name | Path |
|---|---|---|
| `<action>.ts` | `<action>` | DOM clicks via the click driver |
| `<action>Shortcut.ts` | `<action>Shortcut` | Registered key combo + `Tab` traversal via the shortcut driver |

The shortcut variant **must not import any `*.click.puppeteer.ts` driver** — otherwise the two paths are not genuinely different.

## Co-located Puppeteer drivers

For any non-trivial widget (anything beyond a single `page.click(selector)`), ship two drivers next to its `.tsx`:

```
<Component>.tsx
<Component>.click.puppeteer.ts      ← DOM clicks; owns data-testid / role selectors
<Component>.shortcut.puppeteer.ts   ← Key combos; owns the binding constant
```

Driver rules:

- First arg is `Page`. Drivers never call `getPage()`.
- No imports from `electron/main/*` other than `electron/main/mcp/helpers/*`. No React, Redux, or `window.electron.*`.
- Click drivers: scope by `data-testid`, accept a `scopeTestId` arg when reuse on the same screen is plausible. Export the testid as a constant.
- Shortcut drivers: export the binding constant. No `data-testid` lookups. Every per-field helper is named `…FromFocused(page, …)` and assumes/leaves focus on its own field. Never `page.click` to recover focus — failing loudly is the regression we want to catch.
- Wait, don't sleep. Use `waitForSelector` / `waitForFunction`. A bare `setTimeout` is only acceptable as a settle delay after a confirmed state transition.
- A component may ship only the click driver if it has no shortcut surface. It must never ship only the shortcut driver — every shortcut also has a visible control.

`Tab` between fields is owned by **the tool**, not the driver, so field order lives in one place.

## Generic helpers

If a helper would work for ten components without modification, it belongs in `electron/main/mcp/helpers/` (e.g. `listbox.ts` with `pickOptionFromOpenListbox`, `waitForListboxClosed`, `clickOptionByDataValue`, `typeaheadAndCommit`). Otherwise it stays inside the component's `*.puppeteer.ts`.

## Keyboard shortcuts always ship with `ShortcutHint`

From [CLAUDE.md](../../../CLAUDE.md): every shortcut registered with `keyboardManager.functions.registerShortcuts` must be paired with a visible `ShortcutHint` (from `@kernel/modules/KeyboardShortcuts`) on the matching control. Use the wrapper form by default; render `ShortcutHint` manually only when wrapping breaks parent layout. **No hidden bindings.**

## Test harness

- `webapp/jest.globalSetup.ts` probes CDP on `KLIPPEL_CDP_PORT` (default 9222). If unreachable it spawns `yarn dev` (or `xvfb-run yarn dev` when `KLIPPEL_USE_XVFB=1`) and waits up to `KLIPPEL_STARTUP_TIMEOUT_MS` (default 90 s).
- `webapp/jest.globalTeardown.ts` kills the spawned process only if the harness owned it.
- `webapp/jest.setup.ts` polyfills `fetch` from `undici` when missing.
- Tool tests connect via `puppeteer.connect({ browserURL: http://localhost:9222 })`, mock `electron/main/mcp/puppeteer`'s `getPage` to return the connected page, then call `<tool>.execute(...)` directly. Skip the test if CDP is unreachable so unit-test contexts pass.

## Workflow when adding a new MCP tool

1. **Identify the widgets it touches.** For each non-trivial widget, confirm a `*.click.puppeteer.ts` exists; if not, create it co-located with the `.tsx`. Add the matching `*.shortcut.puppeteer.ts` if the widget has a shortcut surface.
2. **Promote any reusable helper** from inline code to `electron/main/mcp/helpers/`.
3. **Create both tool files** under the owning module's `mcpTools/`: `<action>.ts` (click variant, composes click drivers) and `<action>Shortcut.ts` (shortcut variant, composes shortcut drivers + tool-owned `Tab`s).
4. **Register the shortcut** in the relevant component via `keyboardManager.functions.registerShortcuts` and wrap (or manually pair) the trigger control with `ShortcutHint`.
5. **Wire the module's `mcpTools/index.ts`** so `registerMcpTools(server)` attaches both tools. Ensure `electron/main/mcp/index.ts` calls the module's registrar (one-line import + call only — no schemas there).
6. **Write `<tool>.test.ts` and `<tool>Shortcut.test.ts`** next to the tools. Connect via CDP, mock `getPage`, call `execute`, assert the resulting DOM/store state. Skip on CDP unreachable.
7. **If the change is non-trivial,** record it via the `create-change-documents` skill in the affected module's `docs/changes/`.

## Pre-merge checklist

- [ ] Each non-trivial widget has a `*.click.puppeteer.ts` driver next to its component.
- [ ] If the widget has a shortcut surface, it also has a `*.shortcut.puppeteer.ts` driver exporting the binding constant and a `trigger…` (or `…FromFocused`) function with a post-condition `waitForSelector`.
- [ ] Every registered shortcut has a visible `ShortcutHint` on its control.
- [ ] Tool files contain no `page.evaluate` / DOM traversal and no hard-coded key combos — only driver calls, plus direct `page.click`/`page.type` on selectors owned by the tool itself.
- [ ] Click-driver selectors are `data-testid`, `role`, or `aria-label` — never CSS class names or DOM order.
- [ ] Drivers do not call `getPage()` and do not import from `electron/main/*` (except `helpers/`).
- [ ] Shortcut-variant tool is keyboard-only: triggers via `*.shortcut.puppeteer.ts`, types into focused inputs, uses tool-owned `Tab`s. No `*.click.puppeteer.ts` import.
- [ ] Shortcut drivers' field helpers are `…FromFocused` and never `page.click` to recover focus.
- [ ] The module's `mcpTools/index.ts` registers both variants on the passed-in server. `electron/main/mcp/index.ts` only imports the module registrar.
- [ ] `<tool>.test.ts` exists next to the tool, drives `tool.execute` against the live dev app, and skips when CDP is unreachable.

## Don'ts

- Don't put zod schemas or DOM logic in `electron/main/mcp/index.ts`.
- Don't re-implement listbox / panel walks inside an `mcpTools/*.ts` — extract to a driver or helper.
- Don't ship a shortcut without a `ShortcutHint`.
- Don't make the shortcut tool reach for click drivers when focus is wrong — let it fail loudly.
- Don't put `Tab` traversal inside drivers — the tool owns field order.
- Don't add a top-level `webapp/test-mcp-tool.js`-style harness for new tools; tests are module-owned.

## After editing tool definitions

When you change `mcpTools/*.ts` or `electron/main/mcp/index.ts`, run the `reconnect` skill so the MCP server reloads tool schemas before you call them.
