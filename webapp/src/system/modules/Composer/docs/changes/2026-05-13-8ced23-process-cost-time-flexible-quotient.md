---
id: 2026-05-13-8ced23
name: Flexible quotient/dividend in process cost-time forms
description: AddProcessButton and ProcessEditButton accept the temporal unit on either side of costTime (quotient or dividend), with auto-snap enforcing exactly one temporal + one unitary side.
status: implemented
modules: [Composer, Converter]
---

## Context

The add/edit process forms previously hard-coded `costTime` as `unitario / temporal` (e.g. `1 un / 1 min`). Users wanted to enter the inverse form too (`min / un`, `h / un`, etc.) without flipping the form layout. The constraint is that exactly one side must be the unitary unit (`unitario18`) and the other must be a temporal unit — never both temporal nor both unitary.

## Change

- Both `CompoundSelector` filters in `AddProcessButton.tsx` and `ProcessEditButton.tsx` now accept `unitario18` OR any temporal-scale unit on either side.
- New `utils/snapCostTime.ts`: pure helper used by both forms' `onChange`. Given `(prev, next)`, it inspects which side the user changed and snaps the opposite side to the complementary kind when the new state would be invalid (both unitary → snap to `minutos249`; both temporal → snap to `unitario18`).
- The `CompoundSelector` consumed by these forms was changed from semi-controlled (internal `useState`) to fully controlled in the Converter module; see the companion change in `Converter/docs/changes/`.

## Status notes

Implemented. Snap logic is shared between create and edit; not yet covered by automated tests.

## Security

None.

## Performance

None. Snap is O(1) per selector change.
