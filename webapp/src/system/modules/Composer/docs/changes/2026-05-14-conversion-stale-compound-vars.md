# Time conversion: `8 h / 100 un` and `100 un / 8 h` disagree

Status: fixed — fix A and fix C applied, regression e2e test added.

## Symptom

Two processes describing the *same* physical rate produce different
time-per-unit results in the time audit:

| Process | Raw cost time | Audit result |
| ------- | ------------- | ------------ |
| Costura | `8 h / 100 un` | `4.8000 min/un` ✅ |
| Corte   | `100 un / 8 h` | `0.0800 min/un` ❌ |

`8 h / 100 un` and `100 un / 8 h` are the same thing — 8 hours to make 100
units. Both should yield `4.8 min/un`.

## Root cause

`webapp/src/system/modules/Composer/components/viewports/MaterialListAccordion/utils/traceConversion.ts`
walks a path of conversion edges, chaining the running scalar value between
steps. But it only chains `quantidade`. Look at the per-step context setup
(inside the walk loop):

```ts
context["quantidade"] = currentValue;                          // chained ✅
context["quantidadeQuociente"] = normalizedFrom.quotient.amount;  // frozen ❌
context["quantidadeDividendo"] = normalizedFrom.dividend.amount;  // frozen ❌
```

`quantidadeQuociente` and `quantidadeDividendo` are re-seeded from the
**original input compound** on *every* step. They are never updated to reflect
the result of the previous step. So any edge expression past the first step
that references the compound components reads stale data.

### Why Costura works and Corte doesn't

`h / un` has a **direct** edge to `min / un`:

```
h / un -[conv]-> min / un :  (quantidadeQuociente * 60) / quantidadeDividendo
```

It is a single step, so `quantidadeQuociente=8`, `quantidadeDividendo=100` are
legitimately the original input. `(8 * 60) / 100 = 4.8`. Correct.

`un / h` is routed through a **two-step** path — `un / h → un / min → min / un`
— because DFS picks that route rather than the direct `un / h → min / un`
edge:

```
step 1  un / h  -> un / min :  (quantidadeQuociente / quantidadeDividendo) / 60
        ctx: quantidadeQuociente=100, quantidadeDividendo=8
        = (100 / 8) / 60 = 0.2083            -> currentValue = 0.2083 ✅

step 2  un / min -> min / un :  quantidadeDividendo / quantidadeQuociente
        ctx: quantidadeQuociente=100, quantidadeDividendo=8   <-- STALE
        = 8 / 100 = 0.08                     -> WRONG ❌
```

Step 2's expression `quantidadeDividendo / quantidadeQuociente` is an inversion
— it is written assuming `quantidadeQuociente` / `quantidadeDividendo` describe
the **current** `un/min` value (`0.2083 un / 1 min`), whose inversion is
`1 / 0.2083 = 4.8`. Instead the engine hands it the *original* `un/h` input's
`100` and `8`, producing `8 / 100 = 0.08`.

So there are two contributing factors:

1. **Primary bug** — `traceConversion` does not update
   `quantidadeQuociente` / `quantidadeDividendo` as it walks a multi-step path.
   They are only ever valid for the first step.
2. **Aggravating factor** — DFS does not prefer the direct `un / h → min / un`
   edge, so `un / h` takes the multi-step route that trips over factor 1.
   `h / un` happens to have a direct edge and dodges the bug.

## Fix options

- **A. Stop referencing compound components after step 1.** Treat
  `quantidadeQuociente` / `quantidadeDividendo` as inputs to the *first* step
  only. Rewrite chained-step edges to operate purely on `quantidade` — e.g. the
  `un / min → min / un` inversion edge becomes `1 / quantidade`. Then every
  step after the first is a pure scalar transform.
- **B. Update the compound components between steps.** After each step, recompute
  `quantidadeQuociente` / `quantidadeDividendo` to describe the new value. This
  is awkward because a chained value is a scalar ratio, not a compound — there
  is no unambiguous quotient/dividend pair.
- **C. Prefer the shortest path in DFS / add direct edges.** Hides the bug for
  these specific units but leaves the engine wrong for any genuinely multi-step
  compound conversion. Not a real fix on its own.

**Recommendation: A.** It makes the step-chaining contract honest — only the
first step sees the compound, everything downstream is scalar. C is worth doing
additionally as a robustness improvement, but A is the actual correctness fix.

## Applied fix

Both A and C were implemented:

**Fix A — compound vars are first-step-only.**

- `conversion-graph.ts`: every compound→compound time edge was rewritten to
  operate purely on `quantidade`. A compound value *is* its scalar ratio
  (`8 h / 100 un` = `0.08 h/un`), so the quotient/dividend split was never
  needed. Examples: `h/un → min/un` is now `quantidade * 60`; the
  `un/min → min/un` inversion is now `1 / quantidade`; `un/h → min/un` is now
  `60 / quantidade`. These forms are correct whether the edge runs as the first
  step or a chained step.
- `traceConversion.ts`: the walk now only seeds `quantidadeQuociente` /
  `quantidadeDividendo` on step 0. Chained steps get only the running
  `quantidade`. Any future edge that references the compound components past
  step 0 now fails loudly (NaN) instead of silently using stale input.

**Fix C — shortest path.**

`traceConversion.ts` replaced the DFS path search with a BFS that returns the
shortest valid path. `un/h → min/un` now takes the direct one-step edge instead
of detouring through `un/min`. The kernel `dfs` import was dropped.

With both fixes, `8 h / 100 un` and `100 un / 8 h` each resolve to
`4.8 min/un`.

## Regression test

`webapp/src/system/modules/Composer/mcpTools/tests/conversionTimeSymmetry.e2e.test.ts`
drives the real app: it creates two processes, sets one to `8 h / 100 un` and
the other to `100 un / 8 h` via the edit form, opens both time audits, and
asserts both report the same `min/un` result. It fails today (`0.0800` vs
`4.8000`) and should pass once fix A lands.

Supporting changes for the test:

- `editProcess` MCP tool + `ProcessItem.click.puppeteer.ts` driver gained
  optional `quotientUnit` / `dividendUnit` on `costTime`, so a test can change
  compound units (not just amounts) through the edit form.
