---
id: 2026-05-17-d50f7d
name: reorganize e2e tests by scope and category
description: Migrate all existing e2e tests into per-module tests/{collaborative,standalone}/{functionality,persistence,integrity,performance,security}/ folders.
status: in progress
modules: [Composer, Store, Pointer]
---

## Context

E2E tests today are mostly co-located under `mcpTools/tests/` in the Composer module, with a handful of newer Jazz-related tests under module-level `tests/` folders (`Composer/tests`, `Store/tests`) and one driver test under `Pointer/components/tests`. The single flat directory mixes plain feature tests, persistence guarantees, round-trip invariants, and SVG-sanitization checks, which makes it hard to (a) run a meaningful subset, (b) spot coverage gaps in non-functionality categories, and (c) know where a new test belongs.

The updated layout in `webapp/src/docs/quality/e2e-tests.md` requires every e2e test to live under its owning module's `tests/` folder, split first by collaboration scope (`collaborative` vs `standalone`) and then by failure-mode category (`functionality`, `persistence/{session-management,jazz}`, `integrity`, `performance`, `security`).

## Change

Move every existing `*.e2e.test.ts` into the new structure. Create category folders on first use; do not pre-create empty folders. Update any path-sensitive imports (`@helpers/puppeteer/*` already absolute via tsconfig paths, so most files should be path-agnostic — verify per file).

### Composer

Target root: `webapp/src/system/modules/Composer/tests/`.

Standalone / functionality (default home for MCP-tool click+shortcut coverage):

- `mcpTools/tests/addElective.e2e.test.ts` → `tests/standalone/functionality/addElective.e2e.test.ts`
- `mcpTools/tests/addGraduations.e2e.test.ts` → `tests/standalone/functionality/addGraduations.e2e.test.ts`
- `mcpTools/tests/addMaterial.e2e.test.ts` → `tests/standalone/functionality/addMaterial.e2e.test.ts`
- `mcpTools/tests/addProcess.e2e.test.ts` → `tests/standalone/functionality/addProcess.e2e.test.ts`
- `mcpTools/tests/addVisualization.e2e.test.ts` → `tests/standalone/functionality/addVisualization.e2e.test.ts`
- `mcpTools/tests/createModel.e2e.test.ts` → `tests/standalone/functionality/createModel.e2e.test.ts`
- `mcpTools/tests/cycleProcessTimeFocus.e2e.test.ts` → `tests/standalone/functionality/cycleProcessTimeFocus.e2e.test.ts`
- `mcpTools/tests/deleteElective.e2e.test.ts` → `tests/standalone/functionality/deleteElective.e2e.test.ts`
- `mcpTools/tests/deleteGraduation.e2e.test.ts` → `tests/standalone/functionality/deleteGraduation.e2e.test.ts`
- `mcpTools/tests/deleteMaterial.e2e.test.ts` → `tests/standalone/functionality/deleteMaterial.e2e.test.ts`
- `mcpTools/tests/deleteProcess.e2e.test.ts` → `tests/standalone/functionality/deleteProcess.e2e.test.ts`
- `mcpTools/tests/deleteVisualization.e2e.test.ts` → `tests/standalone/functionality/deleteVisualization.e2e.test.ts`
- `mcpTools/tests/editElective.e2e.test.ts` → `tests/standalone/functionality/editElective.e2e.test.ts`
- `mcpTools/tests/editGraduation.e2e.test.ts` → `tests/standalone/functionality/editGraduation.e2e.test.ts`
- `mcpTools/tests/editMaterial.e2e.test.ts` → `tests/standalone/functionality/editMaterial.e2e.test.ts`
- `mcpTools/tests/editProcess.e2e.test.ts` → `tests/standalone/functionality/editProcess.e2e.test.ts`
- `mcpTools/tests/editVisualization.e2e.test.ts` → `tests/standalone/functionality/editVisualization.e2e.test.ts`
- `mcpTools/tests/linkProcessElective.e2e.test.ts` → `tests/standalone/functionality/linkProcessElective.e2e.test.ts`
- `mcpTools/tests/linkProcessMaterial.e2e.test.ts` → `tests/standalone/functionality/linkProcessMaterial.e2e.test.ts`
- `mcpTools/tests/openGarmentDetails.e2e.test.ts` → `tests/standalone/functionality/openGarmentDetails.e2e.test.ts`
- `mcpTools/tests/openMaterialAuditLog.e2e.test.ts` → `tests/standalone/functionality/openMaterialAuditLog.e2e.test.ts`
- `mcpTools/tests/openModel.e2e.test.ts` → `tests/standalone/functionality/openModel.e2e.test.ts`
- `mcpTools/tests/openProcessTimeAudit.e2e.test.ts` → `tests/standalone/functionality/openProcessTimeAudit.e2e.test.ts`
- `mcpTools/tests/renameGarment.e2e.test.ts` → `tests/standalone/functionality/renameGarment.e2e.test.ts`
- `mcpTools/tests/reorderGraduation.e2e.test.ts` → `tests/standalone/functionality/reorderGraduation.e2e.test.ts`
- `mcpTools/tests/switchView.e2e.test.ts` → `tests/standalone/functionality/switchView.e2e.test.ts`
- `mcpTools/tests/uploadVariationSVG.e2e.test.ts` → `tests/standalone/functionality/uploadVariationSVG.e2e.test.ts` (the sanitization assertion stays in the dedicated security file below)

Standalone / persistence / jazz:

- `mcpTools/tests/modelGraphPersistence.e2e.test.ts` → `tests/standalone/persistence/jazz/modelGraphPersistence.e2e.test.ts`
- `mcpTools/tests/modelSvgPersistence.e2e.test.ts` → `tests/standalone/persistence/jazz/modelSvgPersistence.e2e.test.ts`
- `tests/models-jazz.e2e.test.ts` → split:
  - load/save graph + reopen round-trip → `tests/standalone/persistence/jazz/modelsJazzRoundTrip.e2e.test.ts`
  - lease acquire/renew/release → `tests/standalone/persistence/session-management/modelLeaseLifecycle.e2e.test.ts`
  - SVG sanitization (`<script>` / inline-handler strip) → `tests/standalone/security/svgSanitization.e2e.test.ts`

Standalone / integrity:

- `mcpTools/tests/conversionTimeSymmetry.e2e.test.ts` → `tests/standalone/integrity/conversionTimeSymmetry.e2e.test.ts`

Collaborative:

- No collaborative tests exist yet. Create `tests/collaborative/` lazily when the Phase 6 two-instance lease-violation test (currently deferred in `models-jazz.e2e.test.ts`'s header comment) lands.

Fixtures:

- `mcpTools/tests/fixtures/` → `tests/fixtures/` (shared across categories; do not duplicate per category).

### Store

Target root: `webapp/src/kernel/modules/Store/tests/`.

- `tests/jazzFoundation.e2e.test.ts` → split:
  - SQLite file creation, WAL mode, `.jazz-id`, `workspaces.index.json` entry, WAL truncation on shutdown → `tests/standalone/persistence/jazz/jazzFoundation.e2e.test.ts`
  - Single-writer lock rejects second instance → `tests/standalone/persistence/session-management/singleWriterLock.e2e.test.ts`

### Pointer

Target root: `webapp/src/kernel/modules/Pointer/tests/` (new — currently lives under `components/tests`).

- `components/tests/PointerContainer.drag.e2e.test.ts` → `tests/standalone/functionality/pointerContainerDrag.e2e.test.ts`

### Doc + skill updates (already shipped with this plan)

- `webapp/src/docs/quality/e2e-tests.md` Section 1 rewritten to require the new layout; checklist updated.
- `.claude/skills/e2e-test-rules/SKILL.md` quick-reference updated to call out the layout.

### Migration mechanics

- Move with `git mv` so history follows.
- After each move, run the affected `*.e2e.test.ts` file once against a live dev app to confirm the imports still resolve.
- The Jest test root pattern picks up `**/*.e2e.test.ts` recursively; no Jest config change is expected. Verify with `npm run test:e2e -- --listTests` before/after a representative move.
- Remove the now-empty `mcpTools/tests/` directory once all files are gone. Keep `mcpTools/tests/fixtures/` only if anything still references it from there post-migration; otherwise relocate as above.

## Status notes

Draft. Order of execution suggested:

1. Land doc + skill changes (this commit).
2. Migrate `Pointer` (smallest blast radius, single file).
3. Migrate `Store` (one file → two; validates the split pattern).
4. Migrate `Composer` standalone/functionality batch (mechanical `git mv`).
5. Migrate `Composer` persistence + integrity + security splits.
6. Delete legacy `mcpTools/tests/` directory.

Open questions:

- Should `tests/fixtures/` sit at the module root or under each scope (`standalone/fixtures/`, `collaborative/fixtures/`)? Default: module root, until a collaborative fixture appears that genuinely cannot be reused.
- Is `uploadVariationSVG` "functionality" or "security"? Plan splits sanitization out into `svgSanitization.e2e.test.ts`; the upload-happy-path stays under `functionality`. Reconfirm before splitting if the existing file is already small.

## Security

None directly. The reorganization is a file move; the SVG sanitization assertions currently inside `models-jazz.e2e.test.ts` move into a dedicated `tests/standalone/security/svgSanitization.e2e.test.ts` so security regressions become discoverable as a category, not buried inside a persistence test.

## Performance

None. No production code paths change. The Jest worker count and per-test timeouts are unaffected; total e2e runtime is unchanged. Once `tests/standalone/performance/` exists, future perf budgets will live there rather than being inlined into functionality tests.
