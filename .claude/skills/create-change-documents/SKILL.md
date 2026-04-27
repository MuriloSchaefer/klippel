---
name: create-change-documents
description: Use when the user asks to document a code change, write up a change doc, record a planned/in-progress/shipped modification, or track work affecting one or more modules. Creates markdown files under <module>/docs/changes/. Triggers include phrases like "write a change doc", "document this change", "create a change document", "log this change for module X".
---

# Create Change Documents

Record a code change as one markdown file per affected module under `<module>/docs/changes/`. Use this whenever the user wants a durable, reviewable record of a change — planned, partially shipped, or done.

## Where files go

- Inside each affected module's own directory: `<module-path>/docs/changes/` (create if missing).
- Module path examples: `webapp/src/kernel/modules/Pointer/docs/changes/`, `webapp/src/kernel/modules/Layout/docs/changes/`. Match the actual module directory in the repo.
- One file per change, per module. If a single change touches N modules, write N files (same `id`, same content where it makes sense, scoped notes per module).
- Filename: `<id>-<short-name-kebab>.md` (e.g. `2026-04-27-a3f9c2-pointer-snap-to-grid.md`).

## Required frontmatter

Every change document MUST start with this YAML frontmatter:

```yaml
---
id: <YYYY-MM-DD-<small-hash>, e.g. 2026-04-27-a3f9c2>
name: <short name, <=60 chars>
description: <one-sentence description of the change>
status: draft | partially implemented | implemented
modules: [<module>, <module>, ...]
---
```

Status values are exactly: `draft`, `partially implemented`, `implemented`. Nothing else.

## Picking the id

Format: `YYYY-MM-DD-<small-hash>` where:
- `YYYY-MM-DD` is today's date.
- `<small-hash>` is a 6-character lowercase hex string (e.g. `a3f9c2`). Generate via `openssl rand -hex 3`, `python -c "import secrets; print(secrets.token_hex(3))"`, or any equivalent.

The same change written to multiple modules shares one id (one date, one hash, replicated across module folders).

## Body structure

Keep the body tight. Use these sections — `Security` and `Performance` are required (write "None" if not applicable); the others may be omitted when truly empty:

```markdown
## Context
Why this change exists — the problem, request, or constraint driving it.

## Change
What is being changed in this module. Be concrete: files, functions, behaviors.

## Status notes
For `partially implemented`: what's done vs. what's left.
For `draft`: open questions or decisions still needed.
For `implemented`: link to the commit/PR if known.

## Security
Security implications of this change: new attack surface, auth/permission changes, data exposure, input validation, secrets handling. Write "None" if there are no security implications — do not omit the section.

## Performance
Performance implications: expected impact on latency, throughput, memory, bundle size, render cost, or hot paths. Note any benchmarks run or needed. Write "None" if there are no performance implications — do not omit the section.
```

Do not invent sections beyond these unless the user asks.

## Workflow when invoked

1. Confirm with the user (or infer from context) the affected modules, a short name, a description, and status.
2. Generate the `id` as `YYYY-MM-DD-<small-hash>` (today's date + 6-hex-char random).
3. Create `<module-path>/docs/changes/` for each affected module if missing.
4. Write one file per module with the frontmatter above and the body sections that apply.
5. Report back the created file paths.

## Don'ts

- Don't write change docs for trivial edits (typo fixes, formatting) unless the user explicitly asks.
- Don't duplicate the full implementation diff in the doc — describe the change, don't paste the code.
- Don't use statuses other than the three allowed values.
- Don't put change docs anywhere other than `<module-path>/docs/changes/`.
