---
id: 2026-08-06-56f6e4
name: Budget refactor — viewport group lifecycle
description: Expose removeFromGroup, add deleteGroup and an optional group label, stop the tab renderer from crashing on a dangling group reference, and fix the self-dispatching removeFromGroup listener and the dead ColorPicker.
status: implemented
modules: [Orders, Composer, Layout]
---

## Context

Each budget is backed by a viewport tab group: creating a budget calls
`viewportManager.functions.createGroup(budgetId, color)` and adds the active
viewport to it. The group is what makes budget membership visible — grouped
tabs get a coloured top border in
`components/ViewportManager/index.tsx`.

The group API is only half-built for that job:

- `useViewportManager` exposes `createGroup` and `addToGroup`; `removeFromGroup`
  and `deleteGroup` are commented out (`hooks/useViewportManager.ts:27-28`).
  The `removeFromGroup` action, reducer case and middleware already exist —
  only the manager function is missing. `deleteGroup` does not exist at all.
- Deleting a budget therefore leaves an orphaned group and orphaned
  `.session/Layout/viewPortManager/.groups/*.json` files.
- The grouped-tab renderer does `groups[vp.group!].color` — the `!` is flagged
  `// CHORE: remove ! mark` in the source. A viewport whose `group` refers to a
  deleted or not-yet-rehydrated group throws during render of the whole tab bar.
- Groups have no human-readable name: `ViewportGroupState` is `{ name, color }`
  where `name` is the budget id (`budget-3`). Colour is the only affordance a
  user gets for "these tabs are one budget".

See the Orders doc for the full change; this file covers Layout's slice only.

## Change

### 1. `useViewportManager` — complete the group API

```ts
removeFromGroup(viewportName: string): void;   // uncomment; dispatches the existing action
deleteGroup(name: string): void;               // new
```

`deleteGroup` needs a new command/event pair in
`store/viewports/groups/actions.ts` (`deleteGroup` / `groupDeleted`), a case in
`store/viewports/groups/slice.ts` that drops the key, and a
`store/viewports/groups/middlewares.ts` effect that deletes
`.session/Layout/viewPortManager/.groups/${name}.json` and emits `groupDeleted`.

It must **not** implicitly clear `group` on member viewports — Orders sequences
`removeFromGroup` per viewport, then `deleteGroup`, so the two stay orthogonal.

### 2. Move group persistence out of the reducer — and *only* out

`store/viewports/groups/slice.ts` `createGroup` called `storage.ensureDir(...)`
inside the reducer. That moves out, so reducers stay pure.

It does **not** move into the `createGroup` middleware. Session data is a
point-in-time snapshot (CLAUDE.md, e2e-tests.md §12): the sole writer stays the
`saveSession` sweep in `store/middlewares.ts`. That sweep now also calls
`pruneVPGroupFiles`, so a group deleted since the last save does not come back
on the next rehydrate.

An intermediate revision of this change did persist per mutation ("so a group
survives an unclean exit") — that is precisely the behaviour the snapshot rule
forbids, since it moves the saved state to a moment the user never chose.

### 3. Optional group label

Add `label?: string` to `ViewportGroupState` and to the `createGroup` payload.
Orders passes the budget name. `ViewportManager` uses it for the grouped tab's
`aria-label` / title (`"<tab title> — orçamento <label>"`), so the grouping is
discoverable without relying on colour alone — which also covers the
colour-blind case and gives e2e tests a stable assertion target.

Rendering stays the current coloured top border; no new tab-bar chrome.

### 4. Guard the dangling group reference

In `components/ViewportManager/index.tsx`, replace `groups[vp.group!].color`
with a lookup that falls back to `undefined` (no border) when the group is
missing, and drop the `!`. A viewport pointing at a deleted group should render
as an ordinary ungrouped tab, not crash the tab bar.

### 5. Fix the `removeFromGroup` infinite loop (not in the original plan)

`store/viewports/middlewares.ts` listened for `removeFromGroup` and dispatched
**`removeFromGroup`** again — the command, not the `removedFromGroup` event —
so the listener re-entered itself until the stack blew. It had never fired
because nothing called `removeFromGroup`; the first real caller (Orders'
"Remover do orçamento") surfaced it as
`listenerMiddleware/error RangeError: Maximum call stack size exceeded`.

Now emits `removedFromGroup({ viewportName, groupName })`, reading the group
from `getOriginalState()` — by the time the effect runs the reducer has already
cleared `group`.

### 5b. The `switchTheme` reducer wrote the session (not in the original plan)

`store/slice.ts` called `persistTheme` from inside the `switchTheme` reducer,
writing `.session/Layout/theme.json` on every toggle — impure, and a session
write outside the whole-session save. Removed: the reducer now only sets
`state.theme`. Nothing is lost — the `localStorage` mirror is already done by
the `switchTheme` effect in `store/middlewares.ts`, and the session file is
written by the `saveSession` sweep.

### 6. `ColorPicker` was a stub (not in the original plan)

`components/ColorPicker.tsx` rendered a `Dialog` whose `TwitterPicker` was
commented out, and `react-color` is not a dependency (only `@types/react-color`
is), so `colorChange` never fired — no colour could be picked anywhere. Since
budgets need a colour, it was rebuilt with eight preset swatches plus a native
`<input type="color">`, no new dependency, and an optional controlled `value`
prop. Presets are exported as `COLOR_PICKER_PRESETS`.

## Status notes

`implemented`. Verified in the running app: group creation/colouring, tab
`aria-label` carrying the budget name, `removeFromGroup` detaching a single
tab, `deleteGroup` dissolving the group while leaving its viewports open, and
the session JSON being written on create and removed on delete.

Items 5 and 6 were not in the plan — both were latent bugs this work was the
first to exercise.

## Security

None. All state stays in workspace-local session JSON under
`.session/Layout/viewPortManager/.groups/`, no new IPC or network surface.
`deleteGroup` gains a `storage.deleteFile` call whose path is interpolated from
a group name; group names are generated internally (`budget-<n>` via
`_.uniqueId`), never user text, so no traversal risk — but the new group
`label` (user-provided) must stay out of the filename for that to hold.

## Performance

Negligible. `deleteGroup` is a rare user-initiated action. Moving the group
write from the `saveSession` sweep into the `createGroup` effect trades a
periodic write-all for one small `writeBlob` per group created — strictly less
I/O. The tab-bar guard replaces a property access with a lookup + fallback,
inside a list already bounded by the number of open viewports.
