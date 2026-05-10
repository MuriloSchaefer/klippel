# Reusing Puppeteer code across MCP tools

## Why

Domain MCP tools (see [mcp-server.md](./mcp-server.md)) drive the UI through Puppeteer — clicking buttons, opening menus, picking options. Most non-trivial flows reuse the same widgets: a MUI `Select`, a `MaterialSelector`, a `PointerContainer` with confirm/close actions, etc.

If every tool re-implements "open this combobox and click the option whose text matches", we end up with copies of the same brittle logic in every `mcpTools/*.ts` file. When the widget's DOM changes (a new wrapper, a different `role`, a portal), we have to chase the change across N tools.

The fix: **co-locate a puppeteer driver next to the component it drives**, and have MCP tools import it.

## The rule

> If a component has a non-trivial interaction surface (open/select/confirm, multi-step), it ships **two** drivers in a `drivers/` subfolder next to its `.tsx` file: a `drivers/<Component>.click.puppeteer.ts` (UI clicks) and a `drivers/<Component>.shortcut.puppeteer.ts` (keyboard shortcuts). MCP tools compose drivers; they do not re-implement DOM walks or guess key combos. Tool-owned drivers (composing widget drivers + orchestration) live in `mcpTools/drivers/`. E2E tests live in `mcpTools/tests/`.

"Non-trivial" means anything beyond a single `page.click(selector)`. A bare `<Button id="...">` does not need a driver — a tool can click it directly. A `MaterialSelector` (combobox + portal listbox + async options) does.

### Why two drivers per component

The MCP server already exposes paired tools (`createModel` / `createModelShortcut`, `closeViewport` / `closeViewportShortcut` — see [mcp-server.md](./mcp-server.md#naming-convention)). Both variants must produce the same observable outcome, but the *paths* are different: one walks the DOM, the other fires a registered key combo against the focused window. Splitting drivers along the same axis means:

- Each tool variant imports exactly the driver it needs — no `if (useShortcut)` branches inside drivers.
- The shortcut driver is the single source of truth for **which key combo** is bound to the action. When the binding changes in `keyboardManager.functions.registerShortcuts`, only the shortcut driver updates.
- `data-testid` / `role` selectors live only in the click driver. Shortcut drivers have no DOM traversal beyond `page.bringToFront()` and `waitForSelector` post-conditions.

## Where the code lives

Two layers, mirroring how the rest of the codebase is organised:

```
src/
  system/modules/Materials/components/selectors/
    Material.tsx                          ← React component
    MaterialType.tsx
    drivers/
      Material.click.puppeteer.ts         ← click driver: openSelector, pickMaterial, …
      Material.shortcut.puppeteer.ts      ← shortcut driver: focusAndOpenSelector, …
      MaterialType.click.puppeteer.ts
      MaterialType.shortcut.puppeteer.ts

  kernel/modules/Pointer/components/
    PointerContainer.tsx
    drivers/
      PointerContainer.click.puppeteer.ts    ← openPanel, confirm, close (clicks)
      PointerContainer.shortcut.puppeteer.ts ← confirmShortcut (Ctrl+Enter), closeShortcut (Esc), …

  system/modules/Composer/mcpTools/
    addMaterial.ts                        ← composes the *click* drivers
    addMaterialShortcut.ts                ← composes the *shortcut* drivers
    drivers/                              ← tool-owned drivers, if any
    tests/
      addMaterial.e2e.test.ts             ← covers both variants
```

A component is allowed to ship only the click driver if it has no shortcut surface (e.g. a label `TextField`). It must never ship only the shortcut driver — every shortcut also has a visible control (see [CLAUDE.md](../../../CLAUDE.md) on `ShortcutHint`).

Rationale:

- **Co-location** — the driver and the component change together via the sibling `drivers/` folder. When you alter the DOM (`data-testid`, `role`, structure), the matching `.puppeteer.ts` is right next door.
- **Discoverability** — `grep -r .puppeteer.ts` lists every reusable driver, and every `drivers/` folder visibly groups them. No central registry to keep in sync.
- **No renderer imports inside drivers** — the driver only takes a `Page` and selectors/strings. It does not import the React component, Redux, or `window.electron.*`. The constraints from [mcp-server.md](./mcp-server.md#constraints) still apply.
- **`mcpTools/` files stay thin** — each one is a recipe of driver calls plus the tool's `name`/`description`/`inputSchema`. They do not contain DOM-walking helpers.

`electron/main/mcp/puppeteer.ts` keeps owning the singleton `getPage()` — drivers receive a `Page`, they don't acquire one.

## Driver shape

A driver exports plain async functions. It is **not** an MCP tool — no `name`, no `inputSchema`, no `execute`. It is the contract for one component, expressed as Puppeteer calls.

### Click driver

DOM-driven. Owns selectors. Used by the click-variant tool.

```ts
// src/system/modules/Materials/components/selectors/Material.click.puppeteer.ts
import type { Page } from 'puppeteer-core';
import { pickOptionFromOpenListbox, waitForListboxClosed } from '../../../../../../electron/main/mcp/helpers/listbox';

export const MATERIAL_SELECTOR_TESTID = 'add-material-material';

export async function openMaterialSelector(page: Page, scopeTestId = MATERIAL_SELECTOR_TESTID) {
  const selector = `[data-testid="${scopeTestId}"] [role="combobox"]`;
  await page.waitForSelector(selector);
  await waitForListboxClosed(page);
  await page.click(selector);
}

export async function pickMaterial(page: Page, name: string) {
  await pickOptionFromOpenListbox(page, name);
}
```

### Shortcut driver

Key-combo-driven. Owns the binding. Used by the shortcut-variant tool. It still asserts the post-condition through Puppeteer so the tool can fail loudly if the shortcut is unbound or wired to the wrong handler.

```ts
// src/system/modules/Materials/components/selectors/Material.shortcut.puppeteer.ts
import type { Page } from 'puppeteer-core';

// Mirrors the binding registered via keyboardManager.functions.registerShortcuts
// for `${MODULE_NAME}/ModelViewport/addMaterial`.
export const ADD_MATERIAL_SHORTCUT = 'Control+Shift+M';

export async function triggerAddMaterialShortcut(page: Page) {
  await page.bringToFront();
  await page.keyboard.press(ADD_MATERIAL_SHORTCUT);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="add-material-form"]');
}
```

A few conventions that pay off later:

- **Take `Page` as the first argument.** Drivers must not call `getPage()` themselves; the tool owns the lifecycle.
- **Export the `data-testid` as a constant.** The component renders with that constant too (or the tests assert against it). When the id changes, one edit updates both sides.
- **Scope by `data-testid`, not by global `role`.** Two `MaterialSelector`s on the same screen must each be addressable. Accept a `scopeTestId` argument when reuse on the same screen is plausible.
- **Wait, don't sleep.** Use `waitForSelector` / `waitForFunction`. A `setTimeout` is acceptable only as a settle delay after a confirmed state transition (see `pickOption` in `addMaterial.ts`).
- **Return values are plain JSON.** No Puppeteer handles leak out of the driver.

### Truly generic helpers

Things that are not bound to one component — `pickOptionFromOpenListbox`, `waitForListboxClosed`, `confirmPointerPanel` — go in:

```
electron/main/mcp/helpers/
  listbox.ts        ← any MUI Select / Autocomplete portal
  pointer-panel.ts  ← any PointerContainer-driven panel
```

Rule of thumb: if the helper would work for ten different components without modification, it belongs under `electron/main/mcp/helpers/`. Otherwise it belongs in the component's `drivers/*.puppeteer.ts`.

## Composing a tool

### Click variant — composes click drivers

```ts
// src/system/modules/Composer/mcpTools/addMaterial.ts
import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openPointerPanel, confirmPointerPanel } from '@kernel/modules/Pointer/components/PointerContainer.click.puppeteer';
import { openMaterialTypeSelector, pickMaterialType } from '@system/modules/Materials/components/selectors/MaterialType.click.puppeteer';
import { openMaterialSelector, pickMaterial } from '@system/modules/Materials/components/selectors/Material.click.puppeteer';

export const addMaterialTool = {
  name: 'addMaterial',
  description: 'Create a new material node by clicking through the UI.',
  inputSchema: { /* … */ },
  async execute({ label, type, material }: { label: string; type: string; material: string }) {
    const page = await getPage();
    await page.bringToFront();

    await openPointerPanel(page, '#composer-add-material', 'add-material-form');
    await page.type('[data-testid="add-material-label"]', label);

    await openMaterialTypeSelector(page);
    await pickMaterialType(page, type);

    await openMaterialSelector(page);
    await pickMaterial(page, material);

    await confirmPointerPanel(page);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, label }) }] };
  },
};
```

### Shortcut variant — keyboard-only, `Tab` between fields

The shortcut variant must reach every form field with the keyboard alone — no `page.click` to focus an input, no `openSelector` that walks the DOM. Once the panel is open, the cursor lands on the first field, and the driver moves between fields by pressing `Tab` (or `Shift+Tab` to go back). This validates that the form's tab order is correct and that every interactive control is keyboard-reachable — a regression we want a tool to catch.

The shortcut driver for each field exposes a `fill…` (or `pick…`) function that **assumes the field is already focused** and leaves focus on it when done. The MCP tool then issues `page.keyboard.press('Tab')` between calls.

```ts
// src/system/modules/Materials/components/selectors/Material.shortcut.puppeteer.ts
import type { Page } from 'puppeteer-core';

// Mirrors the binding registered for `${MODULE_NAME}/ModelViewport/addMaterial`.
export const ADD_MATERIAL_SHORTCUT = 'm';

export async function triggerAddMaterialShortcut(page: Page) {
  await page.bringToFront();
  await page.keyboard.press(ADD_MATERIAL_SHORTCUT);
  await page.waitForSelector('[role="pointer-panel-content"] [data-testid="add-material-form"]');
  // Convention: the panel autofocuses its first field. The tool starts from there.
}

// Assumes the focused element is a MUI Select (combobox). Opens via Space/Enter,
// types the option text to filter, and Enter to commit. No DOM traversal.
export async function pickMaterialFromFocused(page: Page, name: string) {
  await page.keyboard.press('Enter');           // open listbox
  await page.waitForSelector('ul[role="listbox"]');
  await page.keyboard.type(name);               // typeahead filter
  await page.keyboard.press('Enter');           // commit highlighted option
  await page.waitForFunction(() => !document.querySelector('ul[role="listbox"]'));
}
```

```ts
// src/system/modules/Composer/mcpTools/addMaterialShortcut.ts
import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { triggerAddMaterialShortcut, pickMaterialFromFocused } from '@system/modules/Materials/components/selectors/Material.shortcut.puppeteer';
import { pickMaterialTypeFromFocused } from '@system/modules/Materials/components/selectors/MaterialType.shortcut.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/PointerContainer.shortcut.puppeteer';

export const addMaterialShortcutTool = {
  name: 'addMaterialShortcut',
  description: 'Create a new material node using only the keyboard (shortcut + Tab + typeahead).',
  inputSchema: { /* … */ },
  async execute({ label, type, material }: { label: string; type: string; material: string }) {
    const page = await getPage();

    // 1. Open the PointerContainer with the registered shortcut ('m').
    await triggerAddMaterialShortcut(page);

    // 2. Tab through the form. Focus lands on the label field first.
    await page.keyboard.type(label);
    await page.keyboard.press('Tab');

    await pickMaterialTypeFromFocused(page, type);
    await page.keyboard.press('Tab');

    await pickMaterialFromFocused(page, material);

    // 3. Confirm via the PointerContainer shortcut driver (Ctrl+Enter).
    await confirmPointerPanelShortcut(page);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, label }) }] };
  },
};
```

The three steps mirror the three driver responsibilities: `Material.shortcut.puppeteer.ts` owns the `'m'` binding that opens the panel, the tool owns the `Tab` ordering through the form, and `PointerContainer.shortcut.puppeteer.ts` owns the `Ctrl+Enter` binding that confirms it.

Conventions for the keyboard path:

- **`Tab` is owned by the tool, not the driver.** The tool decides field order, so the field-traversal lives in one place — easy to spot when a new field is inserted in the form. Drivers leave focus on the same field they entered on.
- **Every shortcut driver exports a `…FromFocused` function.** It must not call `page.click` to recover focus — if focus is wrong the tool should fail loudly, because that is the regression we want to detect.
- **No `data-testid` lookups in shortcut drivers.** They use `document.activeElement`, key presses, and post-condition waits only.
- **Confirm with the keyboard too.** `confirmPointerPanelShortcut` presses `Ctrl+Enter` (or whatever the panel binds), it does not click the confirm button.

If the click-variant tool composes through `MaterialSelector`'s click driver, and the shortcut-variant tool composes through its shortcut driver, the two paths exercise genuinely different code — the whole point of having both.

Each tool reads as a sentence. If `MaterialSelector`'s DOM changes, only `Material.click.puppeteer.ts` changes. If the keybinding or its keyboard interaction model changes, only `Material.shortcut.puppeteer.ts` changes.

## Migration scope for `addMaterial` / `addMaterialShortcut`

Components and modules that need a driver (or a fix) before both variants of the tool work end-to-end. Each row says *what* to migrate and *what the driver must own*.

### Drivers to create

| # | Component | Location | Click driver responsibilities | Shortcut driver responsibilities |
|---|---|---|---|---|
| 1 | `PointerContainer` | [kernel/modules/Pointer/components/PointerContainer.tsx](../kernel/modules/Pointer/components/PointerContainer.tsx) | `openPointerPanel(page, triggerSelector, formTestId)`, `closePointerPanel(page)` (clicks `#close-panel`) | `closePointerPanelShortcut(page)` (Esc) |
| 2 | `ConfirmAndCloseButton` | `kernel/modules/Pointer/components/` (used in [AddMaterialButton.tsx:140](../system/modules/Composer/components/viewports/MaterialListAccordion/AddMaterialButton.tsx#L140)) | `confirmPointerPanel(page)` — clicks `[role="pointer-panel-actions"] button:not(#drag-panel):not(#close-panel)` | `confirmPointerPanelShortcut(page)` — `Ctrl+Enter`, owns the binding constant `CONFIRM_POINTER_PANEL_SHORTCUT` |
| 3 | `MaterialTypeSelector` | [system/modules/Materials/components/selectors/MaterialType.tsx](../system/modules/Materials/components/selectors/MaterialType.tsx) | `openMaterialTypeSelector(page, scopeTestId?)`, `pickMaterialType(page, name)` | `pickMaterialTypeFromFocused(page, name)` — Enter to open, typeahead, Enter to commit |
| 4 | `MaterialSelector` | [system/modules/Materials/components/selectors/Material.tsx](../system/modules/Materials/components/selectors/Material.tsx) | Two-phase widget — see [§ MaterialSelector drivers](#materialselector-drivers) below. | Same. |
| 5 | `MaterialTypeMultiSelector` | `system/modules/Materials/components/selectors/` (used in [AddMaterialButton.tsx:90](../system/modules/Composer/components/viewports/MaterialListAccordion/AddMaterialButton.tsx#L90)) | `openMaterialTypeMultiSelector(page)`, `toggleMaterialTypeOption(page, name)`, `commitMaterialTypeMulti(page)` (close listbox) | `toggleMaterialTypeOptionFromFocused(page, name)` — Space to toggle, Esc to commit |
| 6 | `AddMaterialButton` (shortcut registration) | [AddMaterialButton.tsx](../system/modules/Composer/components/viewports/MaterialListAccordion/AddMaterialButton.tsx) | n/a — the button has `id="composer-add-material"`, the click driver targets that | Owns `ADD_MATERIAL_SHORTCUT = 'm'` and the post-condition `waitForSelector('[data-testid="add-material-form"]')`. Lives at `Material.shortcut.puppeteer.ts` (the action belongs to the Materials domain). |

### Generic helpers to extract

Currently inlined in [addMaterial.ts](../system/modules/Composer/mcpTools/addMaterial.ts); promote to `electron/main/mcp/helpers/`.

| Helper | New location | Used by |
|---|---|---|
| `pickOptionFromOpenListbox(page, text)` | `electron/main/mcp/helpers/listbox.ts` | every click driver that wraps a MUI Select / Autocomplete |
| `waitForListboxClosed(page)` | `electron/main/mcp/helpers/listbox.ts` | every click driver before opening a fresh listbox |
| `typeaheadAndCommit(page, text)` | `electron/main/mcp/helpers/listbox.ts` | every shortcut driver's `…FromFocused` |

### MaterialSelector drivers

[MaterialSelector](../system/modules/Materials/components/selectors/Material.tsx) is **not** a single combobox. It exposes its bound value as a single integer (the material `id`, passed via `value` and `onChange`), but the user picks that id by walking through *two* MUI `Select`s rendered side by side:

1. **Principal** — `<Select id="material-name">`. Value is a synthetic `${industry}-${externalId}` string (not the material id). Picking it filters the second select. Visible label comes from `material.attributes[selector.principal]` (e.g. `"tricoline"`).
2. **Extra** — `<Select id="material-extra">`. Value is the actual material `id` (number). Visible label comes from `material.attributes[selector.extra]` (e.g. color, size). Stays empty until a principal is chosen.

The set of "extras" available depends on which principal was selected, and the field name for both phases (`selector.principal`, `selector.extra`) is read off the `MaterialType` schema — it is dynamic per type. A driver that only opens "the combobox" cannot describe this; we need an API that mirrors the two phases, plus a convenience wrapper for callers that already have an integer id.

We therefore offer **two click drivers and two shortcut drivers** for this component, layered:

| Driver | Signature | When to use |
|---|---|---|
| `pickMaterialByPrincipalAndExtra(page, { principal, extra })` | strings matched against the visible labels of each `Select` | Tools whose input is human-readable (`addMaterial({ material: 'tricoline', extra: 'azul' })`). Mirrors what the user types/sees. |
| `pickMaterialById(page, id)` | `id: number` | Tools that already hold a material id (e.g. duplication, paste, replay of a previous selection). Avoids forcing the caller to look up principal/extra labels. |

Both return after the second select has committed and `onChange` has fired (post-condition: the parent form's hidden state contains the integer id — verifiable by the bound `data-testid` rendering it, or by waiting for the listbox to close and the selected text to appear in `#material-extra`).

**Implementation sketch** — `pickMaterialById` is the lower-level primitive when working from an id; `pickMaterialByPrincipalAndExtra` is the lower-level primitive when working from labels. Neither is implemented in terms of the other, because:

- `pickMaterialById` resolves the id → `${industry}-${externalId}` mapping by reading the rendered `<MenuItem value="…">` attributes (or by exposing a small selector helper from the Materials store), then picks the matching extra item by `value={id}`. It does not need the human-readable labels.
- `pickMaterialByPrincipalAndExtra` matches by visible text in each listbox, identical to the existing `pickOption` helper, applied twice.

```ts
// src/system/modules/Materials/components/selectors/Material.click.puppeteer.ts
import type { Page } from 'puppeteer-core';
import { pickOptionFromOpenListbox, waitForListboxClosed } from '../../../../../../electron/main/mcp/helpers/listbox';

export const MATERIAL_SELECTOR_PRINCIPAL_ID = 'material-name';
export const MATERIAL_SELECTOR_EXTRA_ID = 'material-extra';

const openPrincipal = async (page: Page, scopeTestId: string) => {
  const sel = `[data-testid="${scopeTestId}"] #${MATERIAL_SELECTOR_PRINCIPAL_ID}`;
  await page.waitForSelector(sel);
  await waitForListboxClosed(page);
  await page.click(sel);
};

const openExtra = async (page: Page, scopeTestId: string) => {
  const sel = `[data-testid="${scopeTestId}"] #${MATERIAL_SELECTOR_EXTRA_ID}`;
  await page.waitForSelector(`${sel}:not([aria-disabled="true"])`);
  await waitForListboxClosed(page);
  await page.click(sel);
};

export async function pickMaterialByPrincipalAndExtra(
  page: Page,
  { principal, extra, scopeTestId = 'add-material-material' }: { principal: string; extra: string; scopeTestId?: string },
) {
  await openPrincipal(page, scopeTestId);
  await pickOptionFromOpenListbox(page, principal);

  await openExtra(page, scopeTestId);
  await pickOptionFromOpenListbox(page, extra);
}

export async function pickMaterialById(
  page: Page,
  id: number,
  { scopeTestId = 'add-material-material' }: { scopeTestId?: string } = {},
) {
  // Find which principal group contains this id, then open principal, click that group, open extra, click id.
  const principalValue = await page.evaluate((targetId) => {
    // Each <MenuItem value={`${industry}-${externalId}`}> is the principal; each child extra <MenuItem value={id}>
    // is rendered only after the principal is selected, so we read the data from the materials store via a
    // global hook the renderer exposes for tests, or fall back to iterating principals.
    return (window as any).__materialsLookup?.principalForId?.(targetId) ?? null;
  }, id);
  if (!principalValue) throw new Error(`Material id ${id} not present in selector`);

  await openPrincipal(page, scopeTestId);
  await page.evaluate((value) => {
    const item = document.querySelector(`ul[role="listbox"] li[data-value="${value}"]`) as HTMLElement | null;
    item?.click();
  }, principalValue);

  await openExtra(page, scopeTestId);
  await page.evaluate((targetId) => {
    const item = document.querySelector(`ul[role="listbox"] li[data-value="${targetId}"]`) as HTMLElement | null;
    item?.click();
  }, id);
}
```

```ts
// src/system/modules/Materials/components/selectors/Material.shortcut.puppeteer.ts
// Assumes focus is on the principal Select. After the call, focus is on the extra Select committed.
export async function pickMaterialByPrincipalAndExtraFromFocused(
  page: Page,
  { principal, extra }: { principal: string; extra: string },
) {
  await page.keyboard.press('Enter');                  // open principal listbox
  await page.waitForSelector('ul[role="listbox"]');
  await page.keyboard.type(principal);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');                    // move focus to extra Select
  await page.keyboard.press('Enter');                  // open extra listbox
  await page.waitForSelector('ul[role="listbox"]');
  await page.keyboard.type(extra);
  await page.keyboard.press('Enter');
}

export async function pickMaterialByIdFromFocused(page: Page, id: number) { /* … */ }
```

**Renderer dependencies** for the id-based driver to work without DOM scraping:

- Either expose a small `window.__materialsLookup.principalForId(id)` test hook from the Materials module (preferable — keeps the driver from re-implementing store lookups), or
- Render `data-material-id` on each extra `<MenuItem>` and `data-principal-key` on each principal `<MenuItem>` so the driver can resolve the mapping from the DOM alone. (Less invasive but requires both selects to have rendered at least once for the lookup; in practice, the principal list always renders eagerly, so this is fine.)

Pick one and document it. The example above reads the lookup from a renderer-exposed helper.

**`addMaterial` tool wiring** — the tool's `material` input becomes `{ principal, extra }` when called by humans/agents and stays a single `id` for replay tools. Two paths into the same driver layer; the schema picks based on which field set is present.

### Renderer changes required

These are not drivers but renderer adjustments the migration depends on. Without them the shortcut variant cannot work.

| # | File | Change | Why |
|---|---|---|---|
| R1 | [AddMaterialButton.tsx](../system/modules/Composer/components/viewports/MaterialListAccordion/AddMaterialButton.tsx) | Register the `'m'` shortcut via `keyboardManager.functions.registerShortcuts` for `${MODULE_NAME}/ModelViewport/addMaterial`, and ensure `ShortcutHint` already wraps the trigger button (it does — line 172). | `triggerAddMaterialShortcut` has nothing to fire otherwise. |
| R2 | [PointerContainer.tsx](../kernel/modules/Pointer/components/PointerContainer.tsx) | Autofocus the first focusable child of `[role="pointer-panel-content"]` when the panel opens. | Shortcut tools rely on focus landing on the first field — no `page.click` allowed to recover it. |
| R3 | `ConfirmAndCloseButton` | Register `Ctrl+Enter` as the panel's confirm shortcut while the panel is open (and `Esc` for close, if not already). Add `ShortcutHint` next to the confirm label. | `confirmPointerPanelShortcut` and the CLAUDE.md "no hidden bindings" rule. |
| R4 | [Material.tsx](../system/modules/Materials/components/selectors/Material.tsx) | (a) Add stable `data-testid` on each `FormControl` wrapping the principal and extra `Select`s (e.g. `material-selector-principal`, `material-selector-extra`). (b) Render `data-principal-key={`${industry}-${externalId}`}` on the principal `<MenuItem>`s and `data-material-id={id}` on the extra `<MenuItem>`s. (c) Either expose a `window.__materialsLookup.principalForId(id)` test hook from the Materials module, or commit to (b) being sufficient. | The two-phase widget needs both phases to be addressable; the id-based driver needs a way to map id → principal without re-implementing store logic. |
| R5 | [MaterialType.tsx](../system/modules/Materials/components/selectors/MaterialType.tsx) | Same as R4. | Same. |
| R6 | The label `TextField` in [AddMaterialButton.tsx](../system/modules/Composer/components/viewports/MaterialListAccordion/AddMaterialButton.tsx) | Already has `data-testid="add-material-label"` — verify it sits at tab index 0 inside the panel. | Shortcut variant types into focused element first. |

### Rewrite of the tool files themselves

| File | Change |
|---|---|
| [src/system/modules/Composer/mcpTools/addMaterial.ts](../system/modules/Composer/mcpTools/addMaterial.ts) | Replace inline `pickOption` / `openSelect` / `waitForListboxClosed` and DOM walks with calls to the click drivers from rows 1–5. |
| [src/system/modules/Composer/mcpTools/addMaterialShortcut.ts](../system/modules/Composer/mcpTools/addMaterialShortcut.ts) | Compose `triggerAddMaterialShortcut` → `Tab`-separated `…FromFocused` calls → `confirmPointerPanelShortcut`. No imports from `*.click.puppeteer.ts`. |

## Migrating existing tools

`addMaterial.ts` today inlines `pickOption`, `waitForListboxClosed`, and `openSelect`. The migration path:

1. Move the generic listbox helpers to `electron/main/mcp/helpers/listbox.ts`.
2. Create `MaterialType.puppeteer.ts` and `Material.puppeteer.ts` next to their components, exporting `open*` / `pick*` functions that import from the listbox helper.
3. Create `PointerContainer.puppeteer.ts` for `openPointerPanel` (click trigger + wait for `[role="pointer-panel-content"] [data-testid="<form>"]`) and `confirmPointerPanel` (click `[role="pointer-panel-actions"] button:not(#drag-panel):not(#close-panel)`).
4. Rewrite `addMaterial.ts` as a composition of the above.
5. Replace `addMaterial`'s `data-testid`/`id` literals with the constants exported by each driver.

Do this opportunistically — when you write a new tool that would copy logic from an existing one, extract first, then write.

## Checklist before merging a new MCP tool

- [ ] Each non-trivial widget the tool touches has a `drivers/*.click.puppeteer.ts` driver in a `drivers/` subfolder next to its component.
- [ ] If the widget has a shortcut surface, it also has a `drivers/*.shortcut.puppeteer.ts` driver exporting the binding constant and a `trigger…` function with a post-condition `waitForSelector`.
- [ ] The tool file contains no `page.evaluate` / DOM traversal and no hard-coded key combos — only driver calls and direct `page.click`/`page.type` on stable selectors owned by the tool itself.
- [ ] Selectors used by click drivers are `data-testid`, `role`, or `aria-label` — never CSS class names or DOM order.
- [ ] Drivers do not call `getPage()` or import from `electron/main/*` (other than helpers).
- [ ] The shortcut-variant tool (`<tool>Shortcut.ts`) is keyboard-only: it triggers via `*.shortcut.puppeteer.ts`, types into focused inputs, and uses `page.keyboard.press('Tab')` (owned by the tool) to move between fields. It must not import any `*.click.puppeteer.ts` driver.
- [ ] Shortcut drivers for fields export `…FromFocused(page, …)` functions and never call `page.click` to recover focus.
- [ ] The form's first field is autofocused when the panel opens — confirmed by the shortcut driver's post-condition `waitForSelector` and the tool's first `page.keyboard.type(...)` succeeding.
