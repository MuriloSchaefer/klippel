---
name: debug-traces
description: Use when the user wants to analyze React re-renders, trace why a component re-renders, investigate performance regressions, or interpret a React DevTools Profiler export or Chrome Performance trace. Triggers include "why does X re-render", "analyze this profiler trace", "debug re-renders", "check this perf trace", "find the root cause of re-renders for X", or when the user drops a .json profiler/trace file.
---

# Debug React Re-render Traces

The authoritative tool is `webapp/scripts/devtools/analyze_rerenders.py`. Run it against one or both trace files to find what triggers re-renders for the components under investigation.

## Quick start

```bash
# Profiler trace only
python3 webapp/scripts/devtools/analyze_rerenders.py \
  -c ComponentA,ComponentB \
  --profiler path/to/profiler-export.json

# Chrome Performance trace only
python3 webapp/scripts/devtools/analyze_rerenders.py \
  -c ComponentA,ComponentB \
  --perf path/to/perf-trace.json

# Both at once (recommended — cross-reference the two)
python3 webapp/scripts/devtools/analyze_rerenders.py \
  -c ComponentA,ComponentB \
  --profiler path/to/profiler-export.json \
  --perf path/to/perf-trace.json

# Control how many commits the deep dive covers (default 3)
python3 webapp/scripts/devtools/analyze_rerenders.py \
  -c ComponentA -c ComponentB \
  --profiler prof.json --top 5
```

`-c` accepts comma-separated names or can be repeated. Matching is case-insensitive substring — `ElectiveToggle` matches `ElectiveToggleSwitch`.

## Workflow

1. **Ask the user for component names and file paths** if not already provided. Both pieces are required; the script errors without at least one file.
2. **Run the script** with the paths as given. If a file is large (>50 MB) expect a few seconds on load.
3. **Read the output top-down** — the three sections build on each other:
   - [Profiler analysis](#profiler-output) → per-commit breakdown, change reasons
   - [Deep dive](#deep-dive-output) → top N commits by re-render count, owner/parent chains
   - [Perf trace analysis](#perf-trace-output) → Chrome-level prop diffs and cause annotations
4. **Form a hypothesis** from the output and verify it in source code before recommending a fix.

## How to interpret the output

### Profiler output

Each commit block shows:

| Field | What it means |
|---|---|
| `Updaters` | The component(s) whose state/dispatch triggered this commit — start here |
| `HOOKS CHANGED` | Components where a hook returned a new value; `hooks indices` are the hook call order in that component |
| `PROPS CHANGED` | Props that reference-changed between renders; suspect inline objects/functions passed as props |
| `CONTEXT CHANGED` | A context value changed — find the Provider |
| `OTHER re-renders` | Rendered without an obvious cause; usually a parent re-render pulling children along |
| `TARGET COMPONENTS` | The components you passed with `-c`, highlighted across every commit |

**FIBER ID LOOKUP** at the end maps each target component to its fiber id and owner chain — useful when multiple instances exist.

### Deep dive output

Covers the top N commits by re-render count. For each:

- **Top 20 by self-duration** — the slowest individual renders; high self-duration with `hooks=None, props=None` means the component re-rendered because its parent did (no internal change).
- **Hooks-changed / props-changed lists** sorted by duration — the most expensive culprits are first.
- **KEY COMPONENTS block** — full detail for every target component: hook indices, changed props, owner chain, parent chain, direct children. Use the owner chain to find what controls the component; use the parent chain to find what structurally contains it.

### Perf trace output

- **PROP DIFF / UNEQUAL FUNCTION events** — Chrome DevTools annotates when a prop is a new function or object on every render. `Referentially unequal` warnings point directly at inline arrow functions or object literals in JSX.
- **TARGET COMPONENT events** — raw Chrome trace entries for your components; the `detail` payload sometimes carries `cause`/`reason` keys.
- **CAUSE ANNOTATIONS scan** — searches all React trace events for `setState`, `dispatch`, `forceUpdate`, `Referentially` strings. `***`-marked lines are hits in your target components.
- **UNIQUE event names / SAMPLE details** — schema discovery; useful the first time you see a new trace format.

## Common patterns and what to do

| What the output shows | Likely cause | Fix direction |
|---|---|---|
| `hooks indices: [2]` on every commit | Hook #2 (0-indexed) returns a new reference each time | Check `useMemo`/`useCallback` deps at call-site #2 |
| `props: ['onClick']` repeatedly | Inline arrow function in JSX parent | Wrap handler in `useCallback` in the parent |
| `Updaters: [SomeContext.Provider]` on many commits | Context value is recreated on each parent render | Memoize the context value with `useMemo` |
| High self-duration, `hooks=None props=None` | Parent re-renders dragging this child | Wrap component in `React.memo` or lift state |
| `Referentially unequal` on a prop | Object/array literal passed directly as prop | Extract to a stable variable or `useMemo` |
| Many `OTHER` components in the same commit | A high-level component re-rendered without memoization | Find the first un-memoized ancestor and stabilize it |

## Files

- Script: `webapp/scripts/devtools/analyze_rerenders.py`
- Trace exports to keep for reference: `webapp/src/docs/analysis/` (store named exports here so they can be re-run)
