---
id: 2026-08-10-acd00a
name: Model document attachments
description: Add a Documentos accordion that attaches any file to a model, storing bytes in a per-document Jazz fileStream rather than in the model graph.
status: implemented
modules: [Composer, Store]
---

## Context

A model needs to carry arbitrary supporting files — plotter/cut files, supplier
quotes, tech packs, purchase orders, reference photos, receipts. Until now the
only way a file entered a model was as a **logo**, through a narrow SVG/raster
path.

The data model already anticipated this. `DocumentNode` existed in `typings.ts`
with a comment saying as much:

> Generic blob storage node. Holds draw-view SVGs, plotter files, orders,
> receipts, etc. — this change implements only the minimum needed for logos
> while leaving the type open to other kinds.

`HAS_DOCUMENT` / `DOCUMENT_OF` edges were typed and the node was already in the
`VariationGraphState` union. What was missing was a user-facing surface and a
storage path that survives real files.

**Storage was the crux.** Logo documents inline their bytes as base64 in
`DocumentNode.data`, and that node lives inside the model's `graphJson` — one
atomic string, re-serialized in full on every save and retained per version in
CRDT history. Small logo SVGs tolerate that; a handful of 5 MB PDFs would make
the model slow to open, slow to save, and permanently heavier. Attachments
therefore get their own blob storage, following the precedent already in the
schema (`ModelCoMap.svg` is a `co.fileStream()`).

## Change

**Data model.** `DocumentNode` widened so both storage shapes are
representable: `coId` (fileStream-backed attachment) alongside the now-optional
`encoding` / `data` (legacy inline logo asset), plus `label` and `size`. Added
`DOCUMENT_KIND_ATTACHMENT`. The two flavours are told apart by kind *and* by
parent edge — attachments hang off the GARMENT node, logo assets off their LOGO
node — which is what lets the accordion list one without the other.

**Jazz schema** (`Store/schema.ts`): new `DocumentCoMap` (metadata +
`blob: co.fileStream()`) and `DocumentsMap`, with `ModelCoMap.documents`
optional so pre-existing models load unchanged and the record is created on
first upload.

**Main process** (`Composer/main/models.ts`): `uploadModelDocument`,
`loadModelDocument`, `deleteModelDocument`, all behind the same
`leaseHeldByOther` guard `uploadModelSvg` uses. `loadFullModel` resolves
`documents.$each` — metadata only, so listing a model's attachments never drags
bytes through sync. `updateModelGraph` now reconciles: `pruneOrphanDocuments`
parses the graph it just wrote and drops blobs no surviving node references.
New `Composer/main/documents.ts` holds the Electron `dialog` / `shell` surface
(save-as, open-in-OS) — the first `dialog` usage in the repo.

**Renderer.** `useVariationActions` gains `addDocument` (async: bytes upload
first, so a failed upload leaves no dangling node), `renameDocument`,
`deleteDocument`, and `readDocument`. New
`components/viewports/DocumentListAccordion/` — list, add button, row, and a
preview restricted to images/SVG/PDF. Mounted in `ModelViewport`'s settings
panel after Logos.

**Shortcuts.** `Ctrl+d` toggles/focuses the accordion; within it `a` adds, arrows
move row focus, and `e` / `p` / `o` / `s` / `d` act on the focused row. Each is
paired with a visible `ShortcutHint` per repo `CLAUDE.md`.

**Tooling.** MCP tools `addDocument`, `addDocumentShortcut`, `renameDocument`,
`deleteDocument`, `deleteDocumentShortcut`, each composing a click/shortcut
driver; no DOM work in the tool files.

## Status notes

Implemented and green: 8 new e2e tests pass, and the full Composer standalone
suite (49 suites / 139 tests) passes — which is the backward-compat guard, since
making `DocumentNode.data` optional touched three logo readers
(`LogoEditButton`, `LogoMainCopyOverlay`, `useVariationRehydration`).

Deliberately not done:

- **Logo assets were not migrated** to fileStreams. Their inline path still
  works; moving them is a separate change with its own migration concern.
- **The 15 MiB cap has no test.** It is enforced in main before the stream is
  created, but a test would have to push a 15 MiB file through the harness.
- **Orphan blobs are reconciled on save, not on upload.** See Performance.

## Security

Two new pieces of attack surface, both deliberate and both bounded:

- **An SVG attachment is untrusted markup.** Unlike the model's own drawing, an
  attachment can be any file the user was handed. Preview runs it through the
  existing `sanitizeSvg` *and* renders it from a `blob:` URL in an `<img>`,
  which does not execute script even on a sanitizer miss. PDFs render in an
  `<iframe sandbox="">` (no scripts, no same-origin, no navigation). Types with
  no safe renderer get no preview at all — guessing a renderer for an arbitrary
  binary is how you end up executing it. Covered by
  `tests/standalone/security/documentPreviewSanitization.e2e.test.ts`, which
  asserts a hostile SVG's `onload`, `<script>`, `onclick`, and `javascript:`
  href all fail to fire.
- **Open-in-OS writes a decrypted copy outside the workspace.** Inherent to
  handing a file to another application; the workspace's encryption does not
  extend past that call. Each open gets its own `mkdtemp` directory so files
  cannot collide and the copy is not left in a shared, world-listable path.
  Documented at the call site in `main/documents.ts`.

Uploads go through the same edit-lease guard as every other model mutation, so a
non-holder is rejected rather than silently writing. The upload IPC takes a
size-capped ArrayBuffer and stores it opaquely — nothing parses or executes
attachment content anywhere in the app.

## Performance

The point of the design. Attachment bytes never enter `graphJson`, which is the
model's atomic, save-rewritten, history-retained string. A 5 MB PDF costs one
fileStream write and nothing per save; inline, it would have been re-serialized
on every save and kept per version forever.

Asserted directly rather than assumed: `addDocument.e2e.test.ts` saves the model
after uploading, then checks `graphJson` contains the document's *id* but not
its *content*.

Listing is likewise cheap — `loadFullModel` resolves `documents.$each` to
metadata only, leaving each `blob` an unresolved ref, so opening a model with
attachments does not fetch them. Bytes are read only when something asks
(preview, open, save-as), and are never cached in Redux.

One accepted cost: bytes are written to Jazz on upload while the naming node
persists on explicit save, so the two can drift. `updateModelGraph` reconciles
on every save; a model uploaded-to and never saved keeps the blob until its next
save. `modelDocumentPersistence.e2e.test.ts` covers the reconcile.
