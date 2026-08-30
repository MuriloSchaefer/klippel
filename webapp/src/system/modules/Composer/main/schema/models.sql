-- Composer's models, in SQLite.
--
-- Owned by the Composer module and applied by the kernel's migration runner
-- (`electron/main/db`), appended after the Materials tables.
--
-- Same cr-sqlite rules as the catalog (see
-- `Materials/main/schema/catalog.sql` for the full reasoning): non-nullable
-- primary keys, `NOT NULL DEFAULT` on every other column, no unique indexes
-- beyond the PK, and no declared foreign keys on anything replicated.
--
-- **Merge semantics are the open question here, not a solved one.** A model's
-- graph is one JSON string, rewritten whole on every save, so per-column CRDT
-- merge buys nothing: two peers saving the same model concurrently produce
-- last-write-wins over the entire graph. That is what `model_edit_leases`
-- exists to prevent, and why the lease has to become the actual correctness
-- mechanism rather than the nicety it was under Jazz — see phase 3 of
-- `src/docs/analysis/post-jazz-storage-study.md`.

CREATE TABLE IF NOT EXISTS models (
  -- Storage identity: uuidv5(namespace, model_key).
  id          TEXT    NOT NULL PRIMARY KEY,
  -- The id the app uses and every DTO carries.
  model_key   TEXT    NOT NULL DEFAULT '',
  name        TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  -- The whole graph, as the renderer sends and receives it.
  graph_json  TEXT    NOT NULL DEFAULT '{}' CHECK (json_valid(graph_json)),
  -- The model's rendered SVG, as text. It is markup the renderer sanitizes
  -- before mounting, never binary, so it belongs in a column rather than in
  -- the attachment table.
  svg         TEXT    NOT NULL DEFAULT '',
  updated_at  INTEGER NOT NULL DEFAULT 0 CHECK (updated_at >= 0)
);

CREATE TABLE IF NOT EXISTS model_documents (
  -- uuidv5(namespace, model_key + document_key)
  id           TEXT    NOT NULL PRIMARY KEY,
  document_key TEXT    NOT NULL DEFAULT '',
  -- models.model_key. References it — not declarable, see above.
  model_key    TEXT    NOT NULL DEFAULT '',
  kind         TEXT    NOT NULL DEFAULT '',
  mime         TEXT    NOT NULL DEFAULT '',
  filename     TEXT    NOT NULL DEFAULT '',
  size         INTEGER NOT NULL DEFAULT 0 CHECK (size >= 0),
  -- The bytes, as an ordinary BLOB bound as a parameter. Kept out of
  -- `graph_json` deliberately: that field is rewritten in full on every save,
  -- which is fine for a logo and ruinous for a PDF.
  --
  -- SQLite caps a single value at SQLITE_MAX_LENGTH — 1 GB in this build, not
  -- the 2 GB it can be compiled for. The app's own limit is well inside that
  -- and set by memory rather than by the engine; see MAX_DOCUMENT_BYTES in
  -- `modelsDb.ts`. `NOT NULL DEFAULT x''` because a CRR may not have a
  -- nullable column.
  bytes        BLOB    NOT NULL DEFAULT x'',
  updated_at   INTEGER NOT NULL DEFAULT 0 CHECK (updated_at >= 0)
);

-- Who is currently editing what.
--
-- Deliberately **not** replicated: a lease is a statement about a live editing
-- session on one peer, and a stale lease merged in from a peer that has since
-- gone offline would lock a model nobody is editing. Sharing leases across
-- peers needs a coordinator, which is phase 4's problem.
CREATE TABLE IF NOT EXISTS model_edit_leases (
  model_key         TEXT    NOT NULL PRIMARY KEY,
  holder_account_id TEXT    NOT NULL DEFAULT '',
  acquired_at       INTEGER NOT NULL DEFAULT 0 CHECK (acquired_at >= 0),
  expires_at        INTEGER NOT NULL DEFAULT 0 CHECK (expires_at >= 0)
);

CREATE INDEX IF NOT EXISTS models_key ON models(model_key);
CREATE INDEX IF NOT EXISTS model_documents_model ON model_documents(model_key);
