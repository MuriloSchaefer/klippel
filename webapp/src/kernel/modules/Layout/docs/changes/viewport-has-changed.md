# Viewport `hasChanged` Flag

## Summary

Add a `hasChanged` boolean field to the `ViewportState` payload to track whether a viewport has been modified since it was opened. This enables unsaved-changes indicators and guards against accidental data loss.

## Changes

### `store/viewports/state.ts` — `ViewportState`

Add `hasChanged` to the interface:

```ts
export interface ViewportState<S = any> {
  name: string;
  title: string;
  type: string;
  group?: string;
  extra?: S;
  hasChanged?: boolean; // new — optional so callers of addViewport don't need to supply it
}
```

### `store/viewports/actions.ts` — new command + event

Add a command to set the flag and its corresponding event:

```ts
export const setViewportHasChanged = createAction<{ name: string; hasChanged: boolean }>(
  `[${MODULE_NAME}:Viewports:${ACTION_TYPES.COMMAND}] Set viewport has changed`
);

export const viewportHasChangedSet = createAction<{ name: string; hasChanged: boolean }>(
  `[${MODULE_NAME}:Viewports:${ACTION_TYPES.EVENT}] Viewport has changed set`
);
```

### `store/viewports/slice.ts` — reducer 

In `addViewport`, initialize `hasChanged` to `false`:

```ts
builder.addCase(addViewport, (state, { payload }) => {
  const vp = { ...payload, hasChanged: false };
  return {
    ...state,
    viewports: { ...state.viewports, [vp.name]: vp },
  };
});
```

Add a reducer case for the new command and persist the updated state:

```ts
builder.addCase(setViewportHasChanged, (state, { payload: { name, hasChanged } }) => {
  const vp = { ...state.viewports[name], hasChanged };
  return {
    ...state,
    viewports: { ...state.viewports, [name]: vp },
  };
});
```

### `store/viewports/middlewares.ts` — emit event

After the reducer updates state, the middleware reads the updated viewport and dispatches the event. Follow the same pattern as the existing listeners:

```ts
import {
  setViewportHasChanged,
  viewportHasChangedSet,
} from "./actions";

middlewares.startListening({
  actionCreator: setViewportHasChanged,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Layout: {
        viewportManager: { viewports },
      },
    } = getState() as { Layout: LayoutState };
    dispatch(viewportHasChangedSet(viewports[payload.name])); // dispatch event
  },
});
```

### `hooks/useViewportManager.ts` — `setHasChanged`

Add `setHasChanged` to the `ViewportManager` interface and implementation:

```ts
// interface
setHasChanged(name: string, hasChanged: boolean): void;

// implementation
setHasChanged(name, hasChanged) {
  dispatch(setViewportHasChanged({ name, hasChanged }));
},
```

### `components/ViewportManager/index.tsx` — tab label dirty indicator

Both tab variants (grouped and non-grouped) render the viewport title inside a `<span>`. Prefix it with `*` when `hasChanged` is `true`:

```tsx
<span>{vp.hasChanged ? `*${vp.title}` : vp.title}</span>
```

### `components/ViewportManager/index.tsx` — close guard via `PointerContainer`

The close button on each tab currently calls `handleCloseViewport(vp.name)` directly. When `vp.hasChanged` is `true`, wrap the close `IconButton` (the `CloseSharpIcon` trigger) in a `PointerContainer` that asks the user to confirm before closing.

Pattern to follow (same as `DeleteBudgetButton`):

```tsx
const pointerModule = useModule<IPointerModule>("Pointer");
const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
```

When `vp.hasChanged` is `false`, render the close button as today (no wrapper). When `true`, wrap it:

```tsx
{vp.hasChanged ? (
  <PointerContainer
    component={<span>Fechar sem salvar?</span>}
    actions={[
      <ConfirmAndCloseButton
        key="confirm-close"
        handleConfirm={() => handleCloseViewport(vp.name)}
      />,
    ]}
  >
    <IconButton size="small" component="span">
      <CloseSharpIcon sx={{ width: 0.3, marginLeft: 1 }} />
    </IconButton>
  </PointerContainer>
) : (
  <CloseSharpIcon
    sx={{ width: 0.3, marginLeft: 1, alignItems: "center" }}
    onClick={(e) => { e.stopPropagation(); handleCloseViewport(vp.name); }}
  />
)}
```

The same guard applies to the right-click close shortcut (`e.button != 2` handler on the `Tab` `onClick`): check `vp.hasChanged` before calling `handleCloseViewport` directly — if changed, programmatically open the `PointerContainer` instead (or skip the right-click shortcut path for now and handle it in a follow-up).

## Behaviour

- Every viewport added via `addViewport` starts with `hasChanged: false`.
- Modules that own a viewport call `viewportManager.functions.setHasChanged(name, true)` whenever the user makes a change that has not been persisted.
- After a successful save the module resets it with `setHasChanged(name, false)`.
- While `hasChanged` is `true` the tab title is prefixed with `*`.
- Clicking the close button on a dirty viewport opens a `PointerContainer` confirmation; the user must confirm (`ConfirmAndCloseButton`) to proceed with the close.
