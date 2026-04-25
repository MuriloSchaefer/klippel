# Redux Selector Performance Issues

## Current Status (2026-04-25)

Reselect warnings are **still present** (~368 occurrences per session). The initial refactor fixed the selector definitions, but the root causes are in how selectors are **called** from hooks and components, not just how they are defined.

---

## What Was Fixed

The following selector definitions were corrected and no longer produce passthrough warnings on their own:

| File | Fix Applied |
|------|-------------|
| [Store/selectors.ts](../../../kernel/modules/Store/selectors.ts) | `selectModuleState` now wraps with null-safety guard |
| [Layout/panels/selectors.ts](../../../kernel/modules/Layout/store/panels/selectors.ts) | Chains `selectLayout → selectPanels → selectSettingsPanel/selectDetailsPanel` |
| [Layout/ribbonMenu/selectors.ts](../../../kernel/modules/Layout/store/ribbonMenu/selectors.ts) | Extracts `state?.tabs` / `state?.activeTab` (sub-properties, not passthrough) |
| [Layout/viewports/selectors.ts](../../../kernel/modules/Layout/store/viewports/selectors.ts) | `selectViewportStates` and `getViewportGroups` extract sub-properties |
| [Graphs/selectors.ts](../../../kernel/modules/Graphs/store/graphsManager/selectors.ts) | `getGraphState` extracts `state.graphs[graphId]` from full Graph state |
| [Markdown/selectors.ts](../../../kernel/modules/Markdown/store/selectors.ts) | Extracts by path key |
| [SVG/selectors.ts](../../../kernel/modules/SVG/store/selectors.ts) | Extracts by path key |
| [Composer/selectors.ts](../../../system/modules/Composer/store/models/selectors.ts) | Wraps with null-safety (`composerState ? selector(composerState) : undefined`) |
| [Converter/selectors.ts](../../../system/modules/Converter/store/selectors.ts) | Extracts `state?.selectedNode` |
| [materialTypes/selectors.ts](../../../system/modules/Materials/store/materialTypes/selectors.ts) | Extracts sub-properties |
| [Orders/budgets/selectors.ts](../../../system/modules/Orders/store/budgets/selectors.ts) | Removed `Object.values()` from result function |

---

## Remaining Issues

### Issue 1: `selectMaterials(undefined)` — Passthrough Warning (confirmed source)

**Location**: [useMaterials.ts:26-28](../../../system/modules/Materials/hooks/useMaterials.ts#L26)

```typescript
// useMaterials.ts
const defaultSelector = useMemo(() => {
  if (!materials) return undefined   // ← returns undefined when no filter needed
  return (state: MaterialsState) => materials.reduce(...)
}, [materials])

const mat = useAppSelector(
  selectMaterials(defaultSelector)   // ← called with undefined
);
```

```typescript
// materials/selectors.ts
const defaultSelector = (state: MaterialsState) => state  // ← identity selector

export const selectMaterials = (selector?: MaterialSelector) => {
  const usedSelector = selector ?? defaultSelector  // ← falls back to identity
  return createSelector(
    selectMaterialsState,
    (materials) => materials ? usedSelector(materials) : undefined
    //                         ↑ returns materials unchanged → WARNING
  );
};
```

**Why this triggers the warning**: When `selectMaterials(undefined)` is called, the module-level `defaultSelector = state => state` is used as the result function. Reselect detects that the result (`materials`) is the same reference as the input from `selectMaterialsState` and logs the warning.

**Secondary problem**: `selectMaterials(defaultSelector)` is called directly in the render body — not wrapped in `useMemo` — so a **new selector instance is created on every render**, resetting memoization each time.

**Fix**:
```typescript
// useMaterials.ts — memoize the selector call itself
const mat = useAppSelector(
  useMemo(
    () => selectMaterials(defaultSelector ?? undefined),
    [defaultSelector]
  )
);
```
Or better, change `selectMaterials` to return the materials state directly when no selector is provided, avoiding the identity function entirely.

---

### Issue 2: Unmemoized Inline Selector in `Material.tsx` — New Selector Per Render

**Location**: [Material.tsx:37-44](../../../system/modules/Materials/components/selectors/Material.tsx#L37)

```typescript
// Material.tsx — inline function creates a new selector on every render
const materials = useAppSelector(
  selectMaterials((materials) =>            // ← new function reference each render
    Object.values(materials)
      .filter((mat) => mat.type === type)
      .filter(filter ?? noFilter)
      .reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})
  )
);
```

**Why this is a problem**: `selectMaterials` is a factory — each call to it creates a brand-new `createSelector` instance. Because the inline function is not memoized, a fresh selector is created on every render. Each new selector has no cached result, so it recomputes every time. The `reduce` also returns a new object reference even when the data hasn't changed.

**Fix**:
```typescript
const filteredMaterialsSelector = useMemo(
  () => selectMaterials((materials) =>
    Object.values(materials)
      .filter((mat) => mat.type === type)
      .filter(filter ?? noFilter)
      .reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})
  ),
  [type, filter, noFilter]
);

const materials = useAppSelector(filteredMaterialsSelector);
```

---

### Issue 3: `Object.values(s.models)` in `useModelsList.ts` — New Array Per Call

**Location**: [useModelsList.ts:10](../../../system/modules/Composer/hooks/useModelsList.ts#L10)

```typescript
const models = store.hooks.useAppSelector<Model[]>(
  selectComposer((s) => Object.values(s.models))   // ← new selector + new array per render
);
```

**Why this is a problem**: Two issues stacked:
1. `selectComposer(...)` is a factory called in the render body without `useMemo` → new selector instance per render
2. `Object.values(s.models)` creates a new array reference every time the selector runs, even when `models` hasn't changed

**Fix**:
```typescript
const modelsSelector = useMemo(
  () => selectComposer((s) => Object.values(s.models)),
  []
);
const models = store.hooks.useAppSelector<Model[]>(modelsSelector);
```

---

### Issue 4: `getViewportState` Called Without Memoization

**Location**: [useActiveViewport.ts:17](../../../kernel/modules/Layout/hooks/useActiveViewport.ts#L17)

```typescript
const selectedViewport = useAppSelector(selectActiveViewport);
return useAppSelector(getViewportState(selectedViewport!))  // ← new selector when selectedViewport changes
```

`getViewportState` creates a new selector instance per call. Since `selectedViewport` can change (triggering a re-render), this is acceptable when the viewport changes, but would be a problem if this hook is called in hot render paths without `useMemo`.

---

### Issue 5: `Object.values/filter` in KeyboardShortcuts Selectors

**Location**: [KeyboardShortcuts/store/selectors.ts:79](../../../kernel/modules/KeyboardShortcuts/store/selectors.ts#L79)

```typescript
export const selectShortcutsForContext = (contextId: string) =>
  createSelector(
    [selectAllShortcuts],
    (shortcuts) =>
      Object.values(shortcuts).filter(    // ← new array every call
        (shortcut) => shortcut.contextId === contextId
      )
  );

export const selectShortcutByKey = (key: string) =>
  createSelector(
    [selectActiveShortcuts, selectContextStack],
    (activeShortcuts, contextStack) => {
      // Object.values(activeShortcuts) called inline → new array each run
      for (let i = contextStack.length - 1; i >= 0; i--) { ... }
    }
  );
```

These are factory selectors — if called without `useMemo` in components, they create new selectors per render. The `Object.values + filter` pattern also produces new array references even when the underlying data hasn't changed.

---

## Priority Order for Remaining Fixes

1. **Issue 1** — `selectMaterials(undefined)` in `useMaterials.ts`: **confirmed source of the 368 passthrough warnings**. Fix the fallback behavior in `selectMaterials` or memoize the selector call.

2. **Issue 2** — `Material.tsx` inline selector: wrap in `useMemo` to stop recreating selectors per render.

3. **Issue 3** — `useModelsList.ts`: wrap `selectComposer(...)` in `useMemo`.

4. **Issues 4 & 5** — lower impact; address after the above are resolved.

---

## Testing

After implementing fixes, the console should show **zero** occurrences of:
> "The result function returned its own inputs without modification"

Use React DevTools Profiler to verify re-render counts drop for `Material`, `useMaterials`, and `useModelsList` consumers.

---

## Related

- Reselect best practices: https://reselect.js.org/usage/best-practices
