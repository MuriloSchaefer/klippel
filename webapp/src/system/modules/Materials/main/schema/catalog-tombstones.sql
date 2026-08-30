-- Migration 2: what was deleted, and when.
--
-- A delta has to report removals, and a deleted row cannot report itself. The
-- window read tells a renderer what exists; only a tombstone tells it what
-- stopped existing since it last asked.
--
-- Local and not replicated: cr-sqlite tracks its own deletes in
-- `crsql_changes`, so once sync lands this table stays what it is now — the
-- per-process record that answers "what changed for this client".
--
-- Pruned by age rather than kept forever: a client that has been away longer
-- than the horizon re-reads its window instead, which is authoritative.
CREATE TABLE IF NOT EXISTS catalog_tombstones (
  material_key TEXT    NOT NULL PRIMARY KEY,
  deleted_at   INTEGER NOT NULL DEFAULT 0 CHECK (deleted_at >= 0)
);

CREATE INDEX IF NOT EXISTS catalog_tombstones_at
  ON catalog_tombstones(deleted_at);
