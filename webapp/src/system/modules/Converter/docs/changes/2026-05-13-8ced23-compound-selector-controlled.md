---
id: 2026-05-13-8ced23
name: CompoundSelector becomes fully controlled
description: Remove CompoundSelector's internal state mirror so parent-driven snaps (e.g. invariant enforcement in process forms) are reflected in the UI.
status: implemented
modules: [Converter]
---

## Context

`CompoundSelector` held an internal `useState(value)` initialized from props and never re-synced when the parent updated `value`. Parents that wanted to enforce an invariant by mutating the value in `onChange` (see the Composer process forms snap helper) couldn't update the displayed selection — the internal state ignored prop changes after mount.

## Change

`components/CompoundSelector.tsx`: removed the `currState` `useState`. The component is now fully controlled — both `UnitAmountSelector`s render from `value.quotient` / `value.dividend` directly, and `onChange` propagates `{ ...value, quotient }` / `{ ...value, dividend }` without local mirroring. All call sites already wired `value` + `onChange` correctly, so this is behavior-preserving for them while unlocking parent-driven correction.

## Status notes

Implemented.

## Security

None.

## Performance

Slightly less work per render (no local setState call when the user picks a unit); negligible.
