# Change: Expose `convert` as a Pure Utility Function

**Motivated by:** [Composer — Computation audit log & cost persistence](../../../Composer/docs/changes/cache-cost-computation.md)
**Status**: Implemented

---

## Context

The Converter module currently exposes a single `useConverter` React hook. Internally, the hook:

1. Calls `useGraph(CONVERSION_GRAPH_NAME)` to read the conversion graph from Redux.
2. Returns a `Converter` object whose `convert` method closes over that graph state.

This means the entire conversion logic is gated behind React — it can only be called from a component or custom hook. Any code outside React (Redux middleware, pure utilities, server-side logic) cannot perform a conversion without re-implementing the DFS path-finding and expression evaluation.

Evidence that this is already a problem: `traceConversion` in the Composer
(`Composer/components/viewports/MaterialListAccordion/utils/traceConversion.ts`)
duplicates the DFS traversal and expression evaluation from `useConverter` because it
needs to capture intermediate steps. It also still depends on a `Converter` instance
injected from the hook, so it remains indirectly coupled to React.

The planned Composer middleware for persisting `MaterialNode.computedCost` (see linked
doc) makes this gap impossible to ignore: it must recompute material costs inside a
Redux listener, where hooks are unavailable.

---

## Change

### 1. Extract `convert` into a pure function

Create `Converter/utils/convert.ts` with the following signature:

```ts
import type { ConversionGraph } from "../typings";
import type { Value } from "../typings";

export function convert(
  conversionGraph: ConversionGraph,
  from: Value,
  to: string | { quotient: string; dividend: string },
  initialParams?: { [name: string]: number | Value }
): Value | undefined
```

The body is the current `convert` closure from `useConverter.ts`, extracted verbatim.
The only difference is that `conversionGraph` is an explicit parameter instead of a
closure variable captured from `useGraph`.

The function is a plain module export — no React, no Redux, no hooks.

### 2. Update `useConverter` to delegate

`useConverter.ts` becomes a thin wrapper:

```ts
import { convert } from "../utils/convert";

export const useConverter = (): Converter | undefined => {
  const conversionGraph = useGraph<ConversionGraph>(CONVERSION_GRAPH_NAME);
  if (!conversionGraph.state) return undefined;

  return {
    state: conversionGraph.state,
    convert: (from, to, initialParams) =>
      convert(conversionGraph.state!, from, to, initialParams),
  };
};
```

The `Converter` type and return contract stay identical — no call sites break.

### 3. Expose `utils` on `IConverterModule`

Add a `utils` field to the module interface in `Converter/index.ts`:

```ts
import { convert } from "./utils/convert";

export interface IConverterModule extends IModule {
  // ...existing fields...
  utils: {
    convert: typeof convert;
  };
}

const module: IConverterModule = {
  // ...
  utils: { convert },
};
```

### 4. Update `traceConversion` to accept the graph directly

Once the pure `convert` is available, `traceConversion` no longer needs a `Converter`
instance injected from outside. Update its signature to accept `conversionGraph`
directly and call `convert` internally:

```ts
// before
export function traceConversion({
  from, to, initialParams, conversionGraph, converter,
}: { ...; converter: Converter }): ...

// after
export function traceConversion({
  from, to, initialParams, conversionGraph,
}: { ...; conversionGraph: ConversionGraph }): ...
```

Callers (`useMaterialCostComputation`) drop the `converter` parameter — one fewer
dependency to thread through.

---

## Call-site impact

| Caller | Change |
|---|---|
| `useConverter` (hook) | Delegates to `convert(state, ...)` — no API change |
| `useMaterialCostComputation` | Drops `converter` prop passed to `traceConversion` |
| `traceConversion` | Accepts `conversionGraph` instead of `converter` |
| Composer cost middleware (future) | Calls `converterModule.utils.convert(graphState, ...)` directly |

---

## What does NOT change

- The `Converter` type returned by `useConverter` stays identical.
- The `useConverter` hook signature stays identical.
- All existing component consumers of `useConverter` require zero changes.
- The conversion graph data model, DFS algorithm, and `jse-eval` expression
  evaluation are untouched.
