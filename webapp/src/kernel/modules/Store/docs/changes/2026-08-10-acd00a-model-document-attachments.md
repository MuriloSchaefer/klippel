---
id: 2026-08-10-acd00a
name: Model document attachments
description: Add DocumentCoMap / DocumentsMap and an optional ModelCoMap.documents record so models can carry arbitrary files as per-document fileStreams.
status: implemented
modules: [Composer, Store]
---

## Context

Composer needs to attach arbitrary files to a model (see the Composer change
doc for this id). The schema question that drove the design belongs here: where
do the bytes go?

`ModelCoMap.graphJson` is a single atomic string holding the whole variation
graph. It is rewritten in full on every save and retained per version in CRDT
history. That is the right shape for a graph — it is loaded and saved as a
whole, and per-node CRDTs would bloat history — but it makes it the worst
possible place for file bytes. The existing logo assets inline their base64
there, which is tolerable only because logo SVGs are small.

The schema already had the right precedent: `ModelCoMap.svg` is a
`co.fileStream()`, chunked and synced natively by Jazz.

## Change

Two new schema entries next to `ModelCoMap`:

- **`DocumentCoMap`** — one attachment: `documentId`, `kind`, `mime`,
  `filename`, `size`, `updatedAt`, and `blob: co.fileStream()`.
- **`DocumentsMap`** — `co.record(z.string(), DocumentCoMap)`, keyed by
  `documentId`.

`ModelCoMap` gains `documents: co.optional(DocumentsMap)`. Optional matters: a
model written before this change has no such field and must still load, and the
record is created lazily on the first upload rather than for every model.

The corresponding graph node (`DocumentNode`, Composer `typings.ts`) points here
by `documentId` and stores the stream's coId — metadata in the graph, bytes in
the stream.

## Status notes

Implemented. No migration is needed or provided: the field is optional and
absence is the correct state for a model with no attachments.

Logo assets still inline their bytes in `graphJson` and were deliberately not
moved to this record — a separate change, with its own migration.

## Security

None at this layer. `DocumentCoMap` stores opaque bytes under the model's
existing owner group, so attachments inherit exactly the workspace's access
control; no new sharing or permission surface is introduced. The handling that
does carry risk (previewing untrusted markup, handing files to the OS) lives in
Composer and is covered in that module's change doc.

## Performance

This is the reason the entries exist. A `fileStream` keeps file bytes out of
`graphJson`, so attachment size no longer multiplies with save count.

The read path is designed to stay lazy: consumers resolve `documents.$each` to
get metadata while each entry's `blob` stays an unresolved ref, so listing a
model's attachments costs no bytes. `Composer/main/models.ts` does exactly that
in `loadFullModel`, and fetches a blob only on demand.

No measurement was taken at this layer — the observable effect is asserted in
Composer's e2e (`graphJson` contains the document id but not its content).
