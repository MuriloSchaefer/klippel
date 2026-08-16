---
id: 2026-08-10-f9e8d1
name: Catalog delta sync and scale fixes
description: Disable RTK's immutableCheck by default, behind a boot-time opt-in flag, so every dispatch stops deep-walking multi-MB slices in development.
status: implemented
modules: [Materials, Composer, Store]
---

## Context

While diagnosing the Materials catalog lag
([docs/analysis/materials-catalog-lag-analysis.md](../../../../../docs/analysis/materials-catalog-lag-analysis.md),
F6), the kernel store turned out to be amplifying it for every module, not just
Materials.

`configureStore` disabled `serializableCheck` but left `immutableCheck` on. In
development RTK deep-walks the **entire** store before and after every single
dispatch. With a multi-MB Materials catalog in state that cost landed on *every*
action in the app — a keystroke, a hover, a viewport-extra patch — not only on
the ones touching a large slice. Combined with the Redux DevTools backend
serializing a full state snapshot per action, this was a large part of why the
dev build sat at 100% CPU while apparently idle.

## Change

`components/DynamicStore.tsx`: `immutableCheck` is now off by default and reads
its opt-in from `globalThis.__klippelImmutableCheck__`. The store is constructed
once, so the flag is read once — set it in the DevTools console and reload to
bring the check back when hunting an accidental-mutation bug.

Paired with a main-process change outside this module
(`electron/main/index.ts`): the React and Redux DevTools extensions gained an
opt-out, `KLIPPEL_DEV_EXTENSIONS=0`. They were briefly opt-*in*, which was the
wrong default — a dev build without the React and Redux panels is a worse dev
build. The existing `KLIPPEL_USE_XVFB` / `KLIPPEL_E2E_SKIP_DEV_EXTENSIONS` skips
are unchanged.

## Status notes

Implemented. Neither switch affects production builds — `immutableCheck` is a
development-only middleware and the extension install was already dev-only.

The trade-off is explicit: accidental state mutation is no longer caught
automatically. The mitigation is that the flag exists and is documented at the
call site; the alternative — paying a full state deep-walk per dispatch — made
the development build unusable at real catalog sizes.

## Security

None. Both switches are development-only diagnostics.

## Performance

Removes two per-dispatch costs that scaled with total store size rather than
with what the action touched:

- `immutableCheck`: two deep walks of the entire store per dispatch.
- Redux DevTools: action + full state snapshot serialization per dispatch, at a
  tick rate driven by catalog sync.

No isolated benchmark was taken for these two on their own — they were removed
alongside the Materials work, whose end-to-end numbers are in the Materials
change doc for this id. Production behaviour is unchanged by construction.
