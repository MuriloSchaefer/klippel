---
id: 2026-05-17-d50f7d
name: reorganize e2e tests by scope and category
description: Move the Pointer drag e2e test under the new module-wide tests/standalone/functionality/ layout.
status: in progress
modules: [Pointer]
---

## Context

Part of the workspace-wide e2e reorganization defined in `webapp/src/system/modules/Composer/docs/changes/2026-05-17-d50f7d-reorganize-e2e-tests-by-scope-and-category.md` (same id; cross-module change). The Pointer module's lone e2e file lives under `components/tests/`, which predates the per-module `tests/` convention.

This is the first module to migrate — single file, mechanical move — and validates that `git mv` preserves history and that the Jest test-root pattern picks the new location up without a config change.

## Change

- `webapp/src/kernel/modules/Pointer/components/tests/PointerContainer.drag.e2e.test.ts` → `webapp/src/kernel/modules/Pointer/tests/standalone/functionality/pointerContainerDrag.e2e.test.ts`
- Remove the now-empty `components/tests/` directory.
- Verify with `npm run test:e2e -- --listTests` that the new path is discovered.

## Status notes

Draft. Step 2 in the master sequence (after doc + skill updates, before Store).

## Security

None.

## Performance

None.
