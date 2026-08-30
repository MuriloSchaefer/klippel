// The same catalog benchmark as `catalog-sqlite-bench.mjs`, but with cr-sqlite
// CRRs enabled — so the numbers include the CRDT bookkeeping we would pay for
// merge semantics. Evidence for §4 of
// `src/docs/analysis/post-jazz-storage-study.md`.
//
// Setup (the extension is not vendored — v0.16.3 is the last release, Jan 2024):
//   curl -sL -o /tmp/crsqlite.zip \
//     https://github.com/vlcn-io/cr-sqlite/releases/download/v0.16.3/crsqlite-linux-x86_64.zip
//   python3 -c "import zipfile;zipfile.ZipFile('/tmp/crsqlite.zip').extractall('/tmp')"
//   CRSQLITE_EXT=/tmp/crsqlite.so node --experimental-sqlite \
//     scripts/devtools/catalog-crsqlite-bench.mjs
//
// Needs Node 24 (`node:sqlite`). `better-sqlite3` 12.10.0 can load the same
// extension; this uses node:sqlite so it runs without the Electron ABI build.
import { DatabaseSync } from 'node:sqlite';
import { rmSync, statSync } from 'node:fs';

const EXT = process.env.CRSQLITE_EXT ?? '/tmp/crsqlite.so';
const COUNTS = [10_000, 100_000];
const ATTRS_PER_ROW = 12;
const TYPES = ['linha', 'tecido', 'elastico', 'botao', 'ziper', 'etiqueta'];
const COLORS = ['Royal', 'Preto', 'Branco', 'Vermelho', 'Marinho', 'Bege'];
const INDUSTRIES = ['mundialtextil', 'coats', 'rhodia', 'santista'];

const ms = (fn) => {
  const t = process.hrtime.bigint();
  const out = fn();
  return [Number(process.hrtime.bigint() - t) / 1e6, out];
};

const open = (path) => {
  const db = new DatabaseSync(path, { allowExtension: true });
  db.enableLoadExtension(true);
  db.loadExtension(EXT);
  return db;
};

for (const N of COUNTS) {
  const path = `/tmp/klippel-crsqlite-bench-${N}.sqlite`;
  for (const s of ['', '-wal', '-shm']) { try { rmSync(path + s); } catch {} }

  const db = open(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE materials (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL DEFAULT '',
      external_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      usage_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0,
      attrs TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE edges (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      target_id TEXT NOT NULL DEFAULT ''
    );
  `);
  // Upgrade both to conflict-free replicated relations.
  db.prepare(`SELECT crsql_as_crr('materials')`).get();
  db.prepare(`SELECT crsql_as_crr('edges')`).get();
  db.exec(`
    CREATE INDEX edges_by_source ON edges(source_id);
    CREATE INDEX materials_rank ON materials(usage_count DESC, id ASC);
    CREATE INDEX materials_type_rank ON materials(type, usage_count DESC, id ASC);
    CREATE VIRTUAL TABLE materials_fts USING fts5(id UNINDEXED, haystack, tokenize='unicode61');
  `);

  const insMat = db.prepare(
    `INSERT INTO materials (id,type,external_id,name,color,industry,usage_count,updated_at,attrs)
     VALUES (?,?,?,?,?,?,?,?,?)`);
  const insEdge = db.prepare(`INSERT INTO edges (id,source_id,type,target_id) VALUES (?,?,?,?)`);
  const insFts = db.prepare(`INSERT INTO materials_fts (id,haystack) VALUES (?,?)`);

  const [writeMs] = ms(() => {
    db.exec('BEGIN');
    for (let i = 0; i < N; i += 1) {
      const id = `mat-${i}`;
      const type = TYPES[i % TYPES.length];
      const color = COLORS[i % COLORS.length];
      const industry = INDUSTRIES[i % INDUSTRIES.length];
      const name = `${type} ${color} ref ${i}`;
      const attrs = {};
      for (let a = 0; a < ATTRS_PER_ROW; a += 1) {
        attrs[`attr${a}`] = { key: `attr${a}`, valueJson: JSON.stringify(`v-${i}-${a}`) };
      }
      insMat.run(id, type, String(100000 + i), name, color, industry, i % 7, Date.now(), JSON.stringify(attrs));
      insEdge.run(`conformsTo:${id}`, id, 'conformsTo', `${type}@0.0.5`);
      insEdge.run(`manufacturedBy:${id}`, id, 'manufacturedBy', industry);
      insEdge.run(`suppliedBy:${id}:s1`, id, 'suppliedBy', 'seller-1');
      insFts.run(id, `${name} ${color} ${type} ${industry} ${100000 + i}`);
    }
    db.exec('COMMIT');
  });

  const bytes = statSync(path).size;
  const [changeRows] = ms(() => db.prepare(`SELECT count(*) AS n FROM crsql_changes`).get());
  const changeCount = db.prepare(`SELECT count(*) AS n FROM crsql_changes`).get().n;

  db.prepare(`SELECT crsql_finalize()`).get();
  db.close();

  const cold = open(path);
  const pageStmt = cold.prepare(`SELECT * FROM materials ORDER BY usage_count DESC, id ASC LIMIT 100 OFFSET ?`);
  const [firstPageMs, firstPage] = ms(() => pageStmt.all(0));
  const [deepPageMs] = ms(() => pageStmt.all(Math.max(0, N - 200)));
  const edgesStmt = cold.prepare(
    `SELECT * FROM edges WHERE source_id IN (${firstPage.map(() => '?').join(',')})`);
  const [pageEdgesMs] = ms(() => edgesStmt.all(...firstPage.map((r) => r.id)));
  const byId = cold.prepare(`SELECT * FROM materials WHERE id = ?`);
  const [byIdMs] = ms(() => byId.get(`mat-${Math.floor(N / 2)}`));
  const searchStmt = cold.prepare(
    `SELECT m.* FROM materials_fts f JOIN materials m ON m.id = f.id
     WHERE materials_fts MATCH ? ORDER BY m.usage_count DESC, m.id ASC LIMIT 100`);
  const [searchMs, searchRows] = ms(() => searchStmt.all('royal linha'));
  const [updateMs] = ms(() =>
    cold.prepare(`UPDATE materials SET name=?, updated_at=? WHERE id=?`)
      .run('novo nome', Date.now(), 'mat-42'));

  // What a peer would actually ship for an incremental sync.
  const [deltaMs, delta] = ms(() =>
    cold.prepare(`SELECT * FROM crsql_changes WHERE db_version > ?`).all(0));

  cold.prepare(`SELECT crsql_finalize()`).get();
  cold.close();

  console.log(JSON.stringify({
    rows: N,
    dbMB: +(bytes / 1e6).toFixed(1),
    bytesPerRow: Math.round(bytes / N),
    bulkWriteMs: Math.round(writeMs),
    rowsPerSec: Math.round(N / (writeMs / 1000)),
    crsqlChangeRows: changeCount,
    countChangesMs: +changeRows.toFixed(1),
    firstPageMs: +firstPageMs.toFixed(2),
    deepPageMs: +deepPageMs.toFixed(2),
    pageEdgesMs: +pageEdgesMs.toFixed(2),
    byIdMs: +byIdMs.toFixed(3),
    searchMs: +searchMs.toFixed(2),
    searchHits: searchRows.length,
    updateMs: +updateMs.toFixed(3),
    fullDeltaRows: delta.length,
    fullDeltaMs: +deltaMs.toFixed(0),
  }, null, 1));
}
