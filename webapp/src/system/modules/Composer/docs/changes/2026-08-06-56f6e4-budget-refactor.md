---
id: 2026-08-06-56f6e4
name: Budget refactor — settings-panel extension point
description: Composer opens a settings-panel component registry so Orders can mount the "Orçamento" accordion in ModelViewport, extracts the per-unit cost aggregation for Orders to price budget lines with, and drops the dead useComposition stub.
status: implemented
modules: [Orders, Composer, Layout]
---

## Context

Orders needs to render an `Orçamento` accordion inside `ModelViewport`'s
`SettingsPanel`, after `Custo`. Composer cannot import Orders: the dependency
runs the other way (`Orders.depends_on = ['Composer']`), and Orders is loaded
after Composer in `Initializer.tsx`.

Composer also still exposes `useComposition` on `IComposerModule` — a stub that
returns `{ state: selector(null), actions: {} }`. Its only consumers are
`Orders/hooks/useBudgetManager.ts` and `Orders/components/BudgetFloatingButton`,
both of which this change rewrites or deletes. It calls
`composer.actions.addToBudget(...)`, which does not exist and would throw.

See the Orders doc for the full change; this file covers Composer's slice only.

## Change

### 1. Settings-panel extension registry

New registry namespace in `Composer/constants.ts`:

```ts
export const MODEL_VIEWPORT_SETTINGS_REGISTRY_NAME = 'composerModelViewportSettings'
```

`Composer/kernelCalls.ts` `startModule` declares it, empty, as one more key in
its existing `registerComponents` call.

**It must not be a separate `createRegistries` call.** The first attempt did
exactly that, and it blanked Composer's own `ribbonMenuSections.ModelSelector`
— the Compositor ribbon tab crashed with "Element type is invalid … got:
undefined". Both mutators in `Store/components/ComponentsRegistry.tsx` computed
their next value from the same stale `currentRegistries` closure, so the second
`setRegistries` in the tick undid the first. Fixed at the source: all three
mutators now use functional updates, and `registerComponents` creates a missing
registry rather than silently dropping the write —

```ts
if (registry in curr) return {...curr, [registry]: {...curr[registry], ...comp}}
return curr   // <- was a silent no-op
```

— which is what made a registration that ran before its `createRegistry`
vanish with no error.

`components/viewports/ModelViewport/SettingsPanelExtensions.tsx` (new) reads the
registry and renders its entries after the `Custo` accordion, mirroring
`Layout/components/SystemTray/SystemTray.tsx`.

It exists as its own component rather than an inline `map` because
`SettingsPanel` `cloneElement`s each of its children with the panel `state`
(`"expanded" | "collapsed"`). A bare array trips the `ReactElement` children
type, and a fragment swallows the prop — React warns ("Invalid prop `state`
supplied to `React.Fragment`") and contributed accordions never collapse to
icons with the rest. `SettingsPanelExtensions` takes the clone and forwards
`state` down; extensions accept it and pass it to their own `<Accordion>`.

Extension components own that `<Accordion>` wrapper (name, icon, summary,
`focusOnOpen`, `shortcutHint`), so Composer stays ignorant of what is mounted.
Each is already wrapped by `Accordion`'s internal `ErrorBoundary`.

Ordering is registry insertion order for now. If a second extension ever needs
to sit above `Orçamento`, promote the registry values to
`{ order, Component }` — not worth it for one entry.

### 2. Extract the per-unit cost aggregation

`ProcessCostAccordion` computed a variation's cost per produced unit inline.
Orders needs the same number to price a budget line, so the aggregation moved to
`utils/variationUnitCost.ts` (`computeVariationUnitCost`) with a
`hooks/useVariationUnitCost.ts` wrapper exposed on `IComposerModule.hooks`.

The accordion now calls the hook, so the Custo panel and a budget's totals
cannot report different numbers for the same variation. Behaviour is unchanged —
the code moved verbatim, including the per-unit-then-per-minute fallback and
the "unresolvable cost contributes nothing" rule.

### 2b. Material cost is part of the cost

The aggregation now returns **processes + materials**, and the `Custo` accordion
lists every material next to every process, with a subtotal for each group.

Materials had no price anywhere in the model: `computeMaterialCost` yields
*consumption* (kg per garment), and `MaterialState` carries only `stock`. A
garment quote that omits fabric is not a quote, so materials are priced by a
typed `preco` attribute — **money per the material's stock unit**, a plain
number because the denominator is already pinned by `material.stock.unit`.
Money per garment is then `computedStockEquivalentCost × preco` (or
`computedCost` when consumption and stock units already agree — the middleware
only fills the stock-equivalent when they differ).

An unpriced material yields `undefined`, never `0`, and the row says *why*
("material sem preço" / "sem consumo calculado"). A material nobody has priced
must not be indistinguishable from a free one.

**Logos are part of the cost too.** `computeLogoCost` already produced a
per-unit figure (summed over placements, scaled by `methodFactor`) but emitted
it in descriptive units — `"BRL"` / `"un"` — with a note that the aggregation
which would consume them was "a separate future change". That change is here:
`moneyCost` now emits `reais11` / `unitario18`, and the total sums a third
group. The accordion grows a **Logos** section with its own subtotal.

**Electives gate the aggregation.** A process whose elective is off is not
performed, so it contributes neither money nor time, and its material
consumption does not reach the material subtotal.

`computeProcessTime` and `computeMaterialCost` already honoured this — the
former returns no `computedTimePerUnit`, the latter drops the consumption — so
*time* and *material cost* were correct from the start. Process **money** is
read straight off the node in the aggregation and had to be gated explicitly;
without it a disabled step kept billing. In the sample that is the difference
between R$ 29,40 and R$ 37,20 of labour, and 38 versus 47 minutes per piece.

Logos were already gated inside `computeLogoCost` (a disabled logo yields 0),
but the row is gated here too so it can *say* "eletivo desativado" instead of
reading as a genuine R$ 0,00.

An elective that cannot be resolved is deliberately *not* treated as off —
only one that exists and is `false` disables, so a dangling reference never
silently erases a real cost. Disabled rows stay listed, struck through and
marked `data-cost-disabled`: a step that is not being performed in this
configuration is not a deleted step.

Two latent bugs surfaced while testing this, both fixed in
`utils/variationUnitCost.ts`:

1. **The per-minute fallback was unreachable when the per-unit conversion
   threw.** Both attempts shared one `try`, so a process priced in R$/min —
   whose R$/un conversion cannot resolve without the time — fell into the catch
   and read as unpriced. Each attempt now has its own guard.
2. **Identity conversions returned nothing.** The converter resolves a *path*
   between units, so `R$/min → R$/min` came back `undefined` and the fallback
   still produced nothing. The cost is now read directly when it is already in
   the target units, and the converter is asked only when they differ.
3. **`ProcessItem` crashed on a process with no cost.** It rendered
   `units![node.costTime!.quotient.unit].abbreviation` — the non-null assertions
   undid the optional chaining one line above, so a single process without
   `costTime` (or `costMoney`) took down the entire process list with
   *"Cannot read properties of undefined (reading 'quotient')"*. Both compounds
   and the material-consumption chips now go through one `formatCompound`
   helper that returns "não definido" for a missing value and falls back to the
   raw unit id when a unit is not in the conversion graph. An unpriced process
   is a legitimate state — the Custo accordion has always been willing to report
   one — so the list must render it.

### 3. Remove the `useComposition` stub

Delete `useComposition` and the `CompositionState` type from
`Composer/index.ts` / `IComposerModule`. After the Orders rewrite there are no
consumers, and leaving a hook that always resolves to `null` invites the same
class of bug again (`composer.actions.addToBudget` was `undefined` at the call
site).

Coordinate with the Orders doc §5: `useBudgetManager` must stop calling it in
the same change.

### 4. Cost sample + seed test

`tests/standalone/functionality/variationCost.e2e.test.ts` — 8 tests over a
seeded sample of **5 priced materials, 8 processes and 3 logos**, built by
`helpers/puppeteer/generateCostSample.ts` (pure fixture, fixed identities) and
`helpers/puppeteer/seedCostSample.ts` (catalog via the Jazz seed IPC, graph via
the same store actions `useVariationActions` dispatches).

The shape is chosen to hit what the formula must get right: `Corte` consumes
**3** materials, `Revisão` consumes **none**, `Malha PV` and `Tricoline` are each
consumed by two processes (so consumption accumulates), `Enfesto` is priced per
minute, `Inspeção final` has no money at all, and `Bordado` is gated by an
elective that is **off** — priced, timed and consuming a material, yet
contributing to none of the three.

Materials are named for the part they play — `gola externa`, `gola interna`,
`material-principal` (frente e costas), `material-secundario` (mangas e barra)
and `detalhes` (filetes) — and each is bound to the drawing's own labelled
elements. The seeder also registers the SVG **colour proxies** that
`addVisualization` normally applies as a side effect, so the artwork is
repainted in the chosen colours; a raw graph dispatch alone records the intent
and paints nothing. The seed asserts the rendered `fill`/`stroke` of every bound
channel equals the material's hex — which is what catches binding the wrong
channel, since the frente/costa filetes are strokes (`fill:none`), not fills.

The logos cover all three elective states — `Logo peito` has none, `Logo manga`
has one that is **on** (so an enabled elective is proven not to suppress), and
`Logo costas` has one that is **off**. The sample also uploads the real garment
artwork (`public/catalog/2026/fem/camisas/manga-curta-raglan.svg`) and binds
four materials to parts of it through VISUALIZATION nodes, using the drawing's
own `inkscape:label`led group ids (`g96` frente, `g771` costas, …). The seed
script asserts every bound id resolves inside `#svg-editor`, so a binding
aimed at a missing element fails loudly. Expected values are derived
from the fixture, so changing a price keeps the assertions honest.

Seeding is store-level, not click-driven, on purpose: the add-material form is a
three-step dependent selector (tipo → nome → cor) whose options come from the
catalog's `industry`/`externalId` grouping. Driving it five times to arrange a
fixture measures the form, not the cost — and the click path already has its own
coverage.

## Status notes

`implemented`. Verified in the running app: the Orçamento accordion mounts
after `Custo`, collapses to its icon with the panel, and the Compositor ribbon
tab still works (the regression the registry fix addresses). Cost totals are
covered by the seed test above (5 passing); Orders' 29 and the neighbouring
Composer process/material suites' 14 still pass after the cost-hook change.

The `ComponentsRegistry` change is kernel-wide and benefits every module — it
turns a silent no-op into a working registration. Existing callers
(`Layout`, `KeyboardShortcuts`, `Store`, `Materials`) are unaffected: they
create their registries in one module and fill them from another, which worked
before and still works.

Open question: whether the registry should be Composer-owned (as built) or a
generic Layout-level "settings panel extensions" registry keyed by viewport
type. Composer-owned was chosen because the accordion is only meaningful for
`ModelViewport` and Composer already owns that viewport's panel composition.

## Security

None. No new IPC, storage, or network surface; the registry only maps a string
key to a React component registered by an already-loaded, in-tree module.

## Performance

Negligible. One `getRegistry` lookup memoised on `componentRegistryManager`,
plus a `map` over one entry per `ModelViewport` render — the same shape as
`SystemTray`. `ModelViewport` is `React.memo`'d and the extension component is
expected to be too. Deleting `useComposition` removes nothing measurable.
