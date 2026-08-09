---
name: session-persistence
description: Use when adding, changing, or reviewing anything that reads or writes `.session/` in the Klippel webapp — a slice that must survive a restart, a rehydrator, a `persist*`/`prune*` helper, a `registerSessionSaveListener` registration, or a crash on cold open / workspace switch caused by state that has not arrived yet. Triggers include "persist this slice", "why is my state empty on reload", "add a rehydrator", "session save doesn't prune", "deleted thing came back after reload", "cache X in .session", "should this go through Jazz or .session".
---

# Klippel session persistence

`.session/` is a **snapshot of the moment the user last saved**, not a running
log. The product rule and its consequences are normative in
[webapp/src/docs/quality/e2e-tests.md §12](../../webapp/src/docs/quality/e2e-tests.md)
and in the repo `CLAUDE.md`. Read §12 before writing any of this code — this
skill is the how-to, the doc is the canon.

## The one-writer shape

A module that persists gets exactly **one** path from state to disk:

1. `store/<entity>/slice.ts` exports `persistX(entity)` and `pruneXFiles(liveIds)`.
2. `store/session.ts` exports `persistModuleSession(state)` — calls `persistX`
   for every live entity, **then** `pruneXFiles` with the live ids — and a
   `sessionSaver(store)` closure over it.
3. `kernelCalls.ts` registers `sessionSaver(store)` with
   `storage.registerSessionSaveListener`.

Exemplars: `Orders/store/session.ts` (dispatches a `saveSession` action, because
its middlewares are already involved) and `Materials/store/session.ts` (writes
directly, because caching types involves no reducer — an action pair would be
pure indirection). Either is fine; pick by whether the store is already in the
loop.

## Hard rules

- **Never persist from a reducer.** It is impure *and* it is a snapshot write.
- **Never persist from a mutation middleware.** A `createX` / `updateX` /
  `deleteX` effect changes Redux state and emits its event. That is all. "Persist
  immediately so nothing is lost" is exactly what breaks the guarantee — it moves
  the snapshot to a moment the user never chose, so "close without saving"
  silently keeps edits.
- **The save reconciles, it does not append.** Write every live entity *and*
  delete the files of entities that no longer exist, or deletions come back on
  the next rehydrate. A `persist*` with no matching `prune*` is a bug.
- **Listeners may be async and the save awaits them.** `storage.saveSession()`
  resolves once every registered writer has settled — so an async writer gives
  callers (and e2e tests) a real "it is on disk now" for free.
- **A module not on the listener list never gets written.** Adding state that
  must survive a restart means adding the registration too.

## Rehydration

- `defineRehydration<T>(type, restoreFn)` from
  `@kernel/modules/Store/workspaceScope`, plus a `builder.addCase` for it.
- The same `restoreFn` usually also drives `initialState` via a top-level
  `await` (`Orders/store/budgets/slice.ts`, `Materials/store/materialTypes/slice.ts`).
- **Merge vs. replace is a real decision.** Rehydrators run *before*
  `workspaceSelected` fires any async catalog load. If you replace, switching
  into a workspace with no cache yet wipes the slice and reopens whatever window
  the cache was closing. Merge when the entity is *additive* (schemas, versions);
  replace only when a stale entry would actively contradict the truth.
  - The cost of merging is that an entry from the previous workspace lingers
    until the load lands. Say in the code comment why that is the safer failure.
- **Normalise legacy shapes on the way in**, in `restoreFn`, so nothing
  downstream guards for them. Dropping a removed field is a legitimate choice —
  `budgets/slice.ts` drops a pre-`grades` snapshot's hand-typed `amount` rather
  than honouring it, because the quantity now has exactly one source.

## Jazz or `.session/`?

Jazz is the authoritative store. `.session/` is a read-through cache, and it has
to earn its place:

- **Cache it** when a surface reads the state *during render* and the only other
  populator is an async round-trip — that window is a crash, not a flicker. And
  when the entity is additive, so a stale copy is superseded rather than
  contradicted. (`Materials` `materialTypes`: schema versions are appended,
  never deleted.)
- **Don't cache it** when rows go stale — a peer's delete reappearing for a
  frame is the ghost-row race that
  `Materials/docs/changes/2026-05-24-a1f3c7-materials-jazz-only-storage.md`
  removed the material/industry/seller caches over.

Whichever you pick, record the reasoning in a change doc. Both directions have
now been taken in the same module, and the next reader needs to know which
argument applies to what.

## Don't assert state is present during render

The corollary of an async populator: a component that resolves
`someSlice[id].deeper` during render will crash on cold open, on workspace
switch, and on peer refresh. Resolve through a helper that returns `undefined`
(`Materials/store/materialTypes/resolveTypeSchema.ts`) and render nothing — it
re-renders as soon as the state lands.

Put the early return **after every hook**, which means the resolved value stays
optional all the way down (short-circuit the memos, and put the value in their
deps so they recompute when it arrives).

## Testing

Covered by §12.2 — the short version:

- A test that needs state on disk **saves it through the UI**: `saveSessionViaUI`
  from `kernel/modules/Store/components/drivers/SessionAutoSaver.click.puppeteer.ts`.
  Never dispatch `saveSession`, never assume a mutation persisted itself.
- Wait on `[data-testid="session-autosaver-panel"][data-session-saved-at]`, not
  on the click.
- "Created but not saved leaves nothing on disk" and "deleted after save does not
  come back" are both part of the contract and both deserve an `it`.
- **Assert the thing that actually has to survive**, and seed it so the assertion
  can fail. `budgetSession.e2e.test.ts` seeds an explicit grade curve rather than
  asserting the ungraded fallback of 1 — the fallback would pass even if the
  curve were dropped on the way to disk.
- Out-of-band fixture seeding (writing `.session/` from node) is fine; it belongs
  in `helpers/puppeteer/`, never in production code.

## Related

- [e2e-test-rules](../e2e-test-rules/SKILL.md) — §12 lives there and is normative.
- [performance-tests](../performance-tests/SKILL.md) — §11.6: mutations are not
  I/O, so measure the *save* as its own surface.
- [create-change-documents](../create-change-documents/SKILL.md) — a
  cache/no-cache decision is exactly what a change doc is for.
