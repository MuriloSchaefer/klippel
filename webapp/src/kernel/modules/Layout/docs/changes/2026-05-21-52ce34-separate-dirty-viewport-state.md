---
id: 2026-05-21-52ce34
name: Separate dirty viewport state from viewport list
description: Move hasChanged out of ViewportState into a dedicated dirtyViewports map so that setViewportHasChanged no longer invalidates the selectViewportStates selector and re-renders ViewportManagerContent.
status: implemented
modules: [Layout]
---

## Context

Profiling (`elective-toggle-switch` session, 2026-05-21) showed that toggling an elective
produces **two separate React render cycles** totalling ~185 ms.  The second cycle (103.9 ms,
934 fibers) is caused entirely by `markChanged()` in `useVariation`, which dispatches
`setViewportHasChanged`.

The root problem: `hasChanged` is a field on `ViewportState`, which lives inside
`state.Layout.viewportManager.viewports`.  The `setViewportHasChanged` reducer always spreads
the `viewports` object:

```typescript
// store/viewports/slice.ts:106-112
return {
  ...state,
  viewports: { ...state.viewports, [name]: vp },  // new object every dispatch
};
```

`selectViewportStates` returns `state.Layout.viewportManager.viewports`, so any
`setViewportHasChanged` dispatch — even a no-op write of `true → true` — produces a new
selector result.  `ViewportManagerContent` subscribes to this selector (line 47), sees a new
reference, and re-renders its entire subtree including `ViewportLoader` and `ModelViewport`.

## Change

### 1. `store/viewports/state.ts`

- Remove `hasChanged?: boolean` from `ViewportState`.
- Add `dirtyViewports: { [name: string]: boolean }` to `viewportManagerState`.

```typescript
export interface ViewportState<S = any> {
  name: string;
  title: string;
  type: string;
  group?: string;
  extra?: S;
  // hasChanged removed — lives in dirtyViewports now
}

export interface viewportManagerState {
  groups: ViewportGroups;
  activeViewport: string;
  viewports: { [name: string]: ViewportState };
  dirtyViewports: { [name: string]: boolean };   // new
}
```

### 2. `store/viewports/slice.ts`

- `buildInitialState`: add `dirtyViewports: {}`.
- `setViewportHasChanged` case: write to `state.dirtyViewports[name]` instead of
  `state.viewports[name]`.  The `viewports` object must not be touched, so
  `selectViewportStates` keeps its memoised result.
- `addViewport` case: initialise `dirtyViewports[vp.name] = false` (remove `hasChanged`
  from the vp spread).
- `closeViewport` case: delete `dirtyViewports[payload.name]` after removing from `viewports`.

New `setViewportHasChanged` case:

```typescript
builder.addCase(setViewportHasChanged, (state, { payload: { name, hasChanged } }) => {
  return {
    ...state,
    dirtyViewports: { ...state.dirtyViewports, [name]: hasChanged },
  };
});
```

### 3. `store/viewports/selectors.ts`

Add a new selector for dirty state that does NOT touch `viewports`:

```typescript
export const selectDirtyViewports = createSelector(
  getViewportManagerState,
  (state) => state?.dirtyViewports ?? {}
);
```

`selectViewportStates` is left unchanged — its result is now truly stable across
`setViewportHasChanged` dispatches.

### 4. `store/viewports/middlewares.ts`

The `setViewportHasChanged` listener currently reads `viewports[payload.name].hasChanged`
from state (line 85).  Update it to read from `dirtyViewports[payload.name]` instead:

```typescript
const {
  Layout: {
    viewportManager: { dirtyViewports },
  },
} = getState() as { Layout: LayoutState };
dispatch(viewportHasChangedSet({ name: payload.name, hasChanged: dirtyViewports[payload.name] ?? false }));
```

### 5. `components/ViewportManager/index.tsx`

- Add `const dirtyViewports = useAppSelector(selectDirtyViewports)` (alongside the other
  selectors).
- Replace all `vp.hasChanged` references (lines 134, 137, 198, 199) with
  `dirtyViewports[vp.name]`.
- `selectDirtyViewports` memoises on the `dirtyViewports` key which changes only when dirty
  state changes — not when tab names, groups, or extras change.  This new subscription is
  coarser than `selectViewportStates`, but the component already re-renders on dirty changes
  today; the goal is just to decouple it from the viewports layout selector.

### 6. Session persistence — `store/viewports/slice.ts` and `store/middlewares.ts`

Persistence in this module is **explicit and batch**: the `saveSession` listener in
`store/middlewares.ts` calls `persistViewportState`, `persistActiveVP`, etc. all at once.
`dirtyViewports` must be added to this same flow.

#### New helpers in `store/viewports/slice.ts`

```typescript
const DIRTY_SESSION_PATH = ".session/Layout/viewPortManager/dirtyViewports.json";
storage.ensureDir(".session/Layout/viewPortManager");

export const persistDirtyViewports = (dirtyViewports: { [name: string]: boolean }) => {
  storage.writeBlob(
    DIRTY_SESSION_PATH,
    new Blob([JSON.stringify(dirtyViewports)]),
    { encoding: "utf-8" },
  );
};

const restoreDirtyViewports = async (): Promise<{ [name: string]: boolean }> => {
  const exists = await storage.exists(DIRTY_SESSION_PATH);
  if (!exists) return {};
  const content = await storage.readFile<string>(DIRTY_SESSION_PATH, { encoding: "utf-8" });
  return JSON.parse(content) as { [name: string]: boolean };
};
```

Update `buildInitialState` to call `restoreDirtyViewports`:

```typescript
const buildInitialState = async (): Promise<viewportManagerState> => ({
  groups: groupsSlice.getInitialState(),
  activeViewport: await restoreActiveVPSession(),
  viewports: await restoreSession(),
  dirtyViewports: await restoreDirtyViewports(),   // new
});
```

#### Call site in `store/middlewares.ts`

Import `persistDirtyViewports` alongside the existing persist helpers and call it inside
the `saveSession` listener:

```typescript
import { persistActiveVP, persistViewportState, persistDirtyViewports } from "./viewports/slice";

// inside saveSession effect:
persistDirtyViewports(state.viewportManager.dirtyViewports);
```

This keeps the persistence timing consistent with every other piece of Layout state:
writes happen only when the user explicitly saves, not on every content edit.

#### Behaviour on restart

- If the user saved before closing: `dirtyViewports.json` holds whatever the dirty map
  was at save time.  In the normal flow, the Composer save middleware first dispatches
  `setViewportHasChanged({ hasChanged: false })` and then (or as part of the same save
  operation) triggers `saveSession`, so the persisted file will contain `false` for the
  saved viewport — matching the current behaviour.
- If the app crashes mid-edit without saving: `dirtyViewports.json` reflects the state at
  the last successful `saveSession`, which may be stale.  This is the same behaviour as
  the current `hasChanged` field (it is also only written during `saveSession`).
- **Workspace switching**: `buildInitialState` is called by `viewportsRehydrated`
  (registered via `defineRehydration`), so switching workspaces correctly loads the new
  workspace's `dirtyViewports.json`.  No extra work needed here.

#### Migration — sessions written before this change

Old session files have `hasChanged` inside each viewport JSON.  After this change,
`ViewportState` no longer has `hasChanged`, and `restoreSession` will silently ignore the
extra field when parsing.  `dirtyViewports.json` won't exist yet, so `restoreDirtyViewports`
returns `{}` — every viewport starts clean.  This is acceptable: old sessions with
`hasChanged: true` on disk were dirty because of unsaved content changes; those changes
are already in the graph session files, so the user can still save them; they just lose
the `*` indicator on first boot after upgrading.

For the `viewportsRehydrated` action, the payload now includes `dirtyViewports`.  The
reducer case handles it via `builder.addCase(viewportsRehydrated, (_state, { payload }) => payload)` — no change needed there as long as `buildInitialState` always returns the
field.

## Status notes

Draft.  No open questions remaining.

None.

## Performance

This is the primary target of this change.  Expected result:

- `setViewportHasChanged` no longer invalidates `selectViewportStates`.
- `ViewportManagerContent` no longer re-renders on every elective toggle, graduation
  update, or any other graph mutation that calls `markChanged()`.
- Eliminates the second React commit (~104 ms, 934 fibers) measured in the profiling session.
- `selectDirtyViewports` is a cheap selector on a small flat map; it re-renders
  `ViewportManagerContent` only when the dirty indicator actually changes (once per
  save/unsave cycle), not on every content edit.
