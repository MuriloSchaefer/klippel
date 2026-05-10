---
id: 2026-05-10-9be5e1
name: SVG upload shortcuts and MCP tools
description: Add a keyboard shortcut and paired click/shortcut MCP tools (with E2E tests) for uploading an SVG file from disk into a Composer variation via the SVGView empty state.
status: implemented
modules: [Composer]
---

## Context

[SVGView.tsx](../../components/viewports/ModelViewport/SVGView.tsx) renders the per-variation SVG surface inside the Composer ModelViewport. When `variation.state.svg` is unset, it shows an empty state with two affordances: a drag-and-drop dropzone (`Box` wrapping the animated `DragAndDrop.svg`) and a "Fazer upload de SVG" button that proxies to a hidden `<input type="file" accept="image/svg+xml">`. Both paths read the file as text and dispatch [`uploadSVG({ variationId, svgContent })`](../../store/variations/actions.ts#L23) — the only store mutation involved.

Today this surface has:

- No keyboard shortcut. A user already in SVG view ([kernelCalls.ts](../../kernelCalls.ts) `viewAsSVG`, key `2`) still has to mouse to the button.
- No `data-testid`s on the button, the hidden input, or the dropzone. MCP cannot reach this flow.
- No co-located `*.puppeteer.ts` drivers (the file lives flat as `SVGView.tsx`).

This change brings SVG upload to parity with the material/graduation MCP surfaces: a discoverable shortcut with `ShortcutHint`, paired click/shortcut MCP tools that hand a real on-disk file to the renderer, one E2E suite covering both variants, and the directory split needed to host the drivers cleanly. There is no new store action — `uploadSVG` already exists.

## Change

### Mechanism: file upload through Puppeteer

Both MCP variants need to deliver the **bytes of a real file from disk** to the hidden `<input type="file">`. Two puppeteer primitives can do this without `page.evaluate` (per [feedback memory](../../../../../../../.claude/projects/-home-schaefer-Documents-personal-klippel/memory/feedback_no_page_evaluate_in_tools.md)):

1. **`ElementHandle.uploadFile(...absPaths)`** — sets `input.files` directly via CDP and dispatches `change` without ever opening a file chooser. Works whenever the hidden input handle is reachable, *as long as no chooser is already pending* — calling it after a chooser has been opened (e.g. by a click on the proxying button) bypasses that chooser and leaves it dangling.
2. **`page.waitForFileChooser()`** — arm the listener *before* the action, then trigger anything that opens a chooser (visible button click, programmatic `inputRef.click()`, keyboard shortcut that proxies to either). The returned `FileChooser` accepts `accept(absPaths)`, and puppeteer intercepts the chooser before Chromium hands off to the OS dialog.

Decision: **both variants use `waitForFileChooser`**. Reasoning:

- The **click variant** clicks the visible Button, which calls `handleButtonClick` → `fileInputRef.current?.click()` → chooser opens. `waitForFileChooser` is the only correct primitive here.
- The **shortcut variant** presses `u`; the registered action calls `button.click()` on the empty-state Button, which proxies to `inputRef.click()` and opens the same chooser. So the shortcut path *also* produces a chooser — `uploadFile` on the input handle would race that chooser. More importantly, using `uploadFile` would skip the chooser entirely, so the test wouldn't actually prove the shortcut opened one. The whole point of the shortcut variant is to verify `u` reaches the upload affordance; `waitForFileChooser` is what verifies that.

Both variants therefore converge on the same `armChooserAndAccept(page, filePath, trigger)` helper, parameterized by the trigger callback (button click vs. keypress).

Validation: tools must reject when `filePath` does not end in `.svg` (case-insensitive) before any DOM interaction. The browser's `accept="image/svg+xml"` is a UI hint, not a security boundary.

Drag-and-drop on the dropzone is **not** wired to MCP in this change (would require synthesizing a `DataTransfer` via `page.evaluate`, which the memory rule forbids in tool files). It remains a human-only affordance.

### New / modified component surface

[SVGView.tsx](../../components/viewports/ModelViewport/SVGView.tsx) — split into a directory so each interactive surface is its own component, with drivers under a sibling `drivers/` folder (matching the [GraduationListAccordion](../../components/viewports/GraduationListAccordion/) layout):

```
ModelViewport/
  SVGView/
    index.tsx                                 (extracted: dispatch on empty vs. loaded)
    SVGEmptyState.tsx                         (the dropzone + button + hidden input)
    SVGModelViewport.tsx                      (the existing loaded-state component)
    drivers/
      SVGEmptyState.click.puppeteer.ts
      SVGEmptyState.shortcut.puppeteer.ts
    assets/animated-drag-n-drop/...           (moved as-is)
```

UI affordances added on `SVGEmptyState`:

- The wrapping dropzone `Box` gets `data-testid="svg-empty-state"`.
- The "Fazer upload de SVG" `Button` gets `data-testid="upload-svg-button"`, wrapped in `ShortcutHint` from `@kernel/modules/KeyboardShortcuts` (CLAUDE.md rule: no shortcut without a visible hint).
- The hidden `<input type="file">` gets `data-testid="upload-svg-input"`. It must remain in the DOM (not conditionally mounted by drag state) so the `ElementHandle.uploadFile` path can resolve it without a click.

### Shortcut

The empty SVG view registers shortcuts under its **own dedicated contextId**, not under the broader `Composer/ModelViewport` context. This is a hard requirement: bare-letter bindings under `Composer/ModelViewport` (e.g. material `a`, graduation `g`/`r`/`d`/`w`/`s`, view-switch `1`/`2`) are active any time the ModelViewport is mounted, and registering `u` there would risk colliding with — or being swallowed by — those siblings depending on registration order. A child context scoped to the empty state lets us claim bare keys without sweeping the whole ModelViewport surface for conflicts.

```ts
// In SVGView/index.tsx (or kernelCalls.ts as a constant)
export const SVG_EMPTY_STATE_CONTEXT_ID = `${MODULE_NAME}/SVGEmptyState`;
```

Registered in [Composer/kernelCalls.ts](../../kernelCalls.ts):

| Action | Binding | contextId | Resolution |
|---|---|---|---|
| Trigger SVG upload | `u` | `Composer/SVGEmptyState` | `document.querySelector('[data-testid="upload-svg-button"]')?.click()` — proxies to the existing `handleButtonClick`, which `.click()`s the hidden input. |

Context activation: `SVGEmptyState.tsx` pushes/pops `SVG_EMPTY_STATE_CONTEXT_ID` via a `useEffect` on mount/unmount (same pattern as `MATERIAL_LIST_CONTEXT_ID`). Because the empty-state component is conditionally rendered on `!variation.state.svg`, the context is automatically inactive once an SVG is uploaded — no manual tear-down required, and no overlap with any shortcut that targets the loaded SVG editor.

Bare `u` is acceptable inside this isolated context. Still sweep `Composer/ModelViewport` and any global registrations for `u` to make sure a parent context won't capture the keypress before the child context can resolve it (depends on `KeyboardManager` resolution order — verify at register-time).

### MCP tools (paired click + shortcut)

New files under [webapp/src/system/modules/Composer/mcpTools/](../../mcpTools/):

| Click variant | Shortcut variant |
|---|---|
| `uploadVariationSVG.ts` | `uploadVariationSVGShortcut.ts` |

Both registered in [mcpTools/index.ts](../../mcpTools/index.ts).

Tool conventions (per [mcp-puppeteer-tools skill](../../../../../../../.claude/skills/mcp-puppeteer-tools/SKILL.md)):

- **Inputs (both variants):**
  - `variationId: string` — the target variation. Tools first ensure that variation's tab is active and that the ModelViewport is in SVG view (delegates to `switchView` semantics already in the codebase).
  - `filePath: string` — absolute path to a `.svg` file on the host filesystem. Tool validates: file exists, is readable, and ends with `.svg`. Reject with a clear error otherwise — do not try to repair a bad path.
- **Click variant** (`uploadVariationSVG`):
  1. `ensureSVGView(page, variationId)` — switches to SVG view if needed; asserts empty state is mounted (`waitForSelector('[data-testid="svg-empty-state"]')`).
  2. `armChooserAndClickUpload(page, filePath)` — sets up `page.waitForFileChooser()`, clicks `[data-testid="upload-svg-button"]`, calls `chooser.accept([filePath])`.
  3. `waitForSVGLoaded(page, variationId)` — waits until `[data-testid="svg-empty-state"]` detaches AND the loaded `#svg-editor` is present, asserting the dispatch propagated through the Redux state.
- **Shortcut variant** (`uploadVariationSVGShortcut`):
  1. `ensureSVGView(page, variationId)` — same.
  2. `armChooserAndPressUploadBinding(page, filePath)` — sets up `page.waitForFileChooser()`, presses `u` (the `KeyboardManager` routes it to the `Composer/SVGEmptyState` context, which calls `button.click()` → `inputRef.click()` → chooser opens), then `chooser.accept([filePath])`. Same primitive as the click variant, only the trigger differs.
  3. `waitForSVGLoaded` — same.

Tools own all selectors and shortcut bindings via co-located drivers (no cross-imports between `*.click.puppeteer.ts` and `*.shortcut.puppeteer.ts`).

### Puppeteer drivers (under `SVGView/drivers/`)

`drivers/SVGEmptyState.click.puppeteer.ts`:
- Exports `SVG_EMPTY_STATE_TESTID`, `UPLOAD_SVG_BUTTON_TESTID`, `UPLOAD_SVG_INPUT_TESTID`.
- Exports `waitForSVGEmptyState(page)`, `armChooserAndClickUpload(page, filePath)` (uses `page.waitForFileChooser` + `.accept([filePath])`), `waitForSVGLoaded(page, variationId)`.

`drivers/SVGEmptyState.shortcut.puppeteer.ts`:
- Exports `UPLOAD_SVG_BINDING = 'u'`, `pressUploadBinding(page)`, and `armChooserAndPressUploadBinding(page, filePath)` (arms `waitForFileChooser`, presses `u`, calls `chooser.accept([filePath])`).
- No `page.click` to recover focus — failing loudly is the regression we want. No `uploadFile` on the hidden input either: that would bypass the chooser the shortcut is supposed to open.

A small shared helper is anticipated:

`electron/main/mcp/helpers/ensureSVGView.ts`:
- `ensureSVGView(page, variationId)` — focuses the variation tab (via existing tab driver), invokes `switchView('svg')` if not already there, and waits for either the empty state or the loaded editor. Both tool variants reuse it.

### Tests

One file under [mcpTools/tests/](../../mcpTools/tests/) (alongside the other Composer E2E suites), both variants in the same suite (per skill rule):

- `mcpTools/tests/uploadVariationSVG.e2e.test.ts`

The suite uses the shared fixture at [`mcpTools/tests/fixtures/sample.svg`](../../mcpTools/tests/fixtures/sample.svg) — a 200×200 asset containing a stroke-only `<rect>` border, two diagonal `<line>`s forming an X, a quadratic and a cubic Bézier `<path>`, and three filled `<circle>`s. Kept under 1 KB, no external references, intentionally exercising the main SVG primitive types so it doubles as a fixture for any future SVG-loading or rendering tests. Resolve the absolute path at test time. The suite:

- Connects via CDP, mocks `getPage`, shares one workspace fixture (e.g. `e2e-svg-upload`).
- `'upload SVG via click (E2E)'` — calls the click tool, asserts `variation.state.svg` is set in the store and `#svg-editor` is mounted.
- `'upload SVG via shortcut (E2E)'` — calls the shortcut tool with the same fixture, identical assertions. Must not import any click-variant driver.
- `'rejects non-svg path'` — both variants reject when `filePath` ends in `.png`, before any DOM interaction.
- `'rejects missing file'` — both variants reject when the file does not exist on disk.

Skip when CDP is unreachable, matching the other Composer suites.

## Status notes

Draft. Open decisions before implementation:

- **Binding choice (`u`) and context resolution** — the empty-state shortcut is registered under a dedicated `Composer/SVGEmptyState` context, but `KeyboardManager`'s resolution order across overlapping active contexts must be confirmed: if a parent context (`Composer/ModelViewport` or a global) already binds `u`, it could swallow the press before the child context sees it. Verify the child wins; if not, fall back to a chord (`Ctrl+u`) registered in the same dedicated context.
- **Chooser interception on Electron** — both variants depend on `page.waitForFileChooser` reliably intercepting the chooser before Chromium hands off to the OS dialog. Confirm this works on the Electron build the tests run against; call `page.bringToFront()` first since some Electron versions race the native dialog when the window isn't focused.
- **Pre-existing SVG** — `uploadSVG` overwrites freely at the store level, but the empty-state UI is gone once a variation has an SVG. Should the tool error out (`"variation X already has an SVG; clear it first"`) or auto-clear via a precondition step? Lean toward erroring out — clearing is destructive and should be a separate explicit action.
- **Drag-and-drop coverage** — out of scope for MCP (would need `page.evaluate` to synthesize a `DataTransfer`). Keep as a manual-only path; document this in the SVGView story/Storybook entry if one exists.

No code has been written yet; this document is the implementation contract.

## Security

`filePath` is an absolute host path supplied by the MCP caller and read directly by Chromium via the file chooser. The tool must:

- Reject relative paths and paths containing `..` segments before passing them to `uploadFile` / `chooser.accept`. We are not opening the file in Node ourselves — Chromium does — but the input still becomes part of the workspace state.
- Reject anything that does not end in `.svg` (case-insensitive). The browser's `accept="image/svg+xml"` is a UI hint, not a security boundary.
- Not log or persist the absolute path beyond the tool response. The path is local to the user's machine; that is not sensitive on its own, but there is no reason to retain it.

No new IPC surface, no new external endpoints, no secret handling. The actual file content is read by the renderer via `Blob.text()` and dispatched to the local Redux store — same trust model as the human drag-and-drop path.

## Performance

None expected. Each tool is a single user-equivalent interaction sequence reading a small SVG into memory. The SVG content size is bounded by what `uploadSVG` already accepts; if the existing reducer doesn't have a limit, this change does not introduce one (out of scope). Test cost adds one Jest spec driving two CDP scenarios — bounded and parallelizable with the existing material/graduation suites.
