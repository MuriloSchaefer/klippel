-- The materials catalog, in SQLite.
--
-- Owned by the Materials module and applied by the kernel's migration runner
-- (`electron/main/db`). Written as SQL rather than as a string in TypeScript so
-- it reads as a schema, diffs as a schema, and can be opened against a live
-- database with any SQLite client while debugging.
--
-- ## Constraints cr-sqlite imposes on replicated tables
--
-- `crsql_as_crr` refuses a table that breaks any of these, and it refuses at
-- *upgrade* time — the first time we turn sync on, against users' existing
-- data. So they are honoured from the first migration, not retrofitted:
--
--   1. A non-nullable primary key, and no AUTOINCREMENT: two peers would
--      assign the same key to unrelated rows.
--   2. Every non-PK column NOT NULL DEFAULT. A merge fills columns it has no
--      value for from the default, so absence is '' or 0, never NULL.
--   3. No unique indexes besides the primary key.
--   4. No declared foreign keys. Verified against v0.16.3: the check is
--      `count(*) FROM pragma_foreign_key_list(<table>)`, so *any* FK
--      declaration is rejected. The error text ("must not have checked foreign
--      key constraints") is misleading, and the connection's foreign_keys
--      pragma makes no difference.
--
-- (4) is inherent rather than a cr-sqlite quirk: a merge can legitimately
-- deliver an edge before the material it points at, so an enforced FK would
-- reject correctly-replicated data. References between replicated tables are
-- therefore written below as comments; integrity is the writer's job
-- (`catalogWriter.ts`), and an orphan edge is ignored, not fatal.
--
-- CHECK constraints *are* allowed on CRR tables, so every closed-vocabulary
-- column has one, and they are enforced on every local write. They are
-- deliberately **suspended while merging** a peer's changes: a change row
-- carries one column, so an incoming row is materialised from defaults and
-- filled in, and `type IN (…)` would reject that intermediate row whose `type`
-- is still ''. A check describes a complete row, which a merge only produces
-- at the end of its (single) transaction. See `applyChanges` in
-- `electron/main/sync/client.ts`.
--
-- Primary keys are uuidv5(namespace, domain key) — see `electron/main/db/ids.ts`
-- for why they are derived rather than random.

CREATE TABLE IF NOT EXISTS materials (
  -- Storage identity: uuidv5(namespace, material_key).
  id            TEXT    NOT NULL PRIMARY KEY,
  -- The id the app uses and every DTO carries. Not unique-indexed: a CRR may
  -- not carry unique indexes beyond its PK, and the PK is a function of this
  -- column, so uniqueness holds by construction.
  material_key  TEXT    NOT NULL DEFAULT '',
  type          TEXT    NOT NULL DEFAULT '',
  label         TEXT    NOT NULL DEFAULT '',
  external_id   TEXT    NOT NULL DEFAULT '',
  external_url  TEXT    NOT NULL DEFAULT '',
  image_url     TEXT    NOT NULL DEFAULT '',
  description   TEXT    NOT NULL DEFAULT '',
  schema_version TEXT   NOT NULL DEFAULT '',
  -- Searchable, so promoted out of the blob into columns of their own.
  name          TEXT    NOT NULL DEFAULT '',
  color_label   TEXT    NOT NULL DEFAULT '',
  -- Denormalised from the manufacturedBy edge: read on every page, searched on
  -- every query. References organizations(org_key) — not declarable, see above.
  industry      TEXT    NOT NULL DEFAULT '',
  stock_amount  REAL    NOT NULL DEFAULT 0 CHECK (stock_amount >= 0),
  stock_unit    TEXT    NOT NULL DEFAULT '',
  pos_x         REAL    NOT NULL DEFAULT 0,
  pos_y         REAL    NOT NULL DEFAULT 0,
  -- The rest of the material as the renderer's DTO carries it: attributes /
  -- composition / caracteristics, JSON-encoded. One blob rather than a CoValue
  -- per key is the whole point (see src/docs/jazz-is-dead.md).
  attrs_json    TEXT    NOT NULL DEFAULT '{}' CHECK (json_valid(attrs_json)),
  composition_json TEXT NOT NULL DEFAULT ''
    CHECK (composition_json = '' OR json_valid(composition_json)),
  caracteristics_json TEXT NOT NULL DEFAULT ''
    CHECK (caracteristics_json = '' OR json_valid(caracteristics_json)),
  updated_at    INTEGER NOT NULL DEFAULT 0 CHECK (updated_at >= 0)
);

CREATE TABLE IF NOT EXISTS material_edges (
  -- uuidv5(namespace, edge_key)
  id         TEXT NOT NULL PRIMARY KEY,
  edge_key   TEXT NOT NULL DEFAULT '',
  -- materials.id (the UUID). References it — not declarable, see above.
  source_id  TEXT NOT NULL DEFAULT '',
  -- The material_key the edge hangs off, so a page can resolve its edges
  -- without a join and the DTO can carry domain ids on both ends.
  source_key TEXT NOT NULL DEFAULT '',
  type       TEXT NOT NULL DEFAULT ''
    CHECK (type IN ('conformsTo', 'manufacturedBy', 'suppliedBy', 'succeedsVersion')),
  -- Polymorphic by design: a material_types key, an organizations key, or a
  -- version string, depending on `type`. Never a foreign key even in spirit.
  target_id  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS material_types (
  -- uuidv5(namespace, type_key)
  id          TEXT NOT NULL PRIMARY KEY,
  -- "name@version", the id the app uses.
  type_key    TEXT NOT NULL DEFAULT '',
  schema_json TEXT NOT NULL DEFAULT ''
    CHECK (schema_json = '' OR json_valid(schema_json))
);

CREATE TABLE IF NOT EXISTS organizations (
  -- uuidv5(namespace, org_key)
  id         TEXT    NOT NULL PRIMARY KEY,
  org_key    TEXT    NOT NULL DEFAULT '',
  type       TEXT    NOT NULL DEFAULT '' CHECK (type IN ('industry', 'seller')),
  label      TEXT    NOT NULL DEFAULT '',
  name       TEXT    NOT NULL DEFAULT '',
  country    TEXT    NOT NULL DEFAULT '',
  contact    TEXT    NOT NULL DEFAULT '',
  pos_x      REAL    NOT NULL DEFAULT 0,
  pos_y      REAL    NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0 CHECK (updated_at >= 0)
);

-- Local projection, never replicated: rank order is (usage desc, key asc) and
-- usage lives in Composer's models, where two peers legitimately disagree about
-- which materials *they* use. Not a CRR, so it gets a real foreign key.
CREATE TABLE IF NOT EXISTS material_usage (
  material_id TEXT    NOT NULL PRIMARY KEY
              REFERENCES materials(id) ON DELETE CASCADE,
  uses        INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0)
);

-- Non-unique by necessity: a CRR may not carry unique indexes beyond its PK.
CREATE INDEX IF NOT EXISTS materials_key ON materials(material_key);
CREATE INDEX IF NOT EXISTS materials_type ON materials(type, id);
CREATE INDEX IF NOT EXISTS material_edges_source ON material_edges(source_key);
CREATE INDEX IF NOT EXISTS material_edges_target ON material_edges(target_id);
CREATE INDEX IF NOT EXISTS material_types_key ON material_types(type_key);
CREATE INDEX IF NOT EXISTS organizations_key ON organizations(org_key);

-- Derived locally from the replicated rows; not replicated itself, because
-- FTS5 virtual tables cannot be CRRs. Keyed by material_key, which is what a
-- search joins back to and what the answer returns.
CREATE VIRTUAL TABLE IF NOT EXISTS materials_fts USING fts5(
  id UNINDEXED,
  haystack,
  tokenize='unicode61'
);
