---
id: 2026-08-30-2cbf25
name: Session restore tolerates a broken file
description: A truncated or zero-byte .session/ file no longer stops the renderer from mounting; every Layout restore parses through a guard that falls back and warns.
status: implemented
modules: [Layout]
---

## Context

A peer in the two-peer debug session came up with a blank window — no UI, no
error, nothing clickable. The renderer had never mounted:

```
SyntaxError: Unexpected end of JSON input
  restoreDirtyViewports (store/viewports/slice.ts:44)
  async buildInitialState (store/viewports/slice.ts:87)
```

`.session/Layout/viewPortManager/dirtyViewports.json` was **zero bytes**. The
app had been killed moments after a save, and session writes are
fire-and-forget — `persistDirtyViewports` calls `storage.writeBlob` without
awaiting it — so the file existed with nothing in it.

The parse runs inside a rehydration that builds the store's initial state, so
it is upstream of every error boundary: one unreadable file took the whole
application down, on every subsequent boot, with no way to recover from inside
the app. The only fix available to a user would have been deleting a file they
have no reason to know about.

## Change

New `store/sessionFile.ts` exporting `parseSessionFile(raw, path, fallback)`:
returns the fallback for an empty, missing or unparseable file, and warns with
the path so a dropped file is explainable rather than mysterious.

Every Layout restore now goes through it:

- `store/viewports/slice.ts` — `dirtyViewports`, and each viewport file (a
  viewport with no `name` is dropped rather than keyed as `undefined`).
- `store/viewports/groups/slice.ts` — each group file, same name guard.
- `store/panels/slice.ts` — `details.json`, `settings.json`.
- `store/slice.ts` — `theme.json`.

Unit-tested in `store/sessionFile.test.ts`, including the zero-byte case that
caused this.

The trade is deliberate and one-sided: a dropped session file costs a restored
tab, a theme, a panel width. A dropped renderer costs the application.

## Status notes

Implemented. Verified against the actual broken file: the peer that would not
mount now boots with the zero-byte `dirtyViewports.json` still on disk.

Not addressed: the writes themselves are still fire-and-forget, so a file can
still be left truncated. Making session writes atomic (write-temp-then-rename)
would remove the cause rather than the symptom, and is worth doing separately —
this change is what stops the symptom being fatal.

## Security

None. The guard only widens what is tolerated when reading local session files
already under the user's own workspace directory; nothing new is parsed,
trusted, or executed.

## Performance

None measurable. One `try`/`catch` and an emptiness check per session file, on
a path that already does file I/O per entry.
