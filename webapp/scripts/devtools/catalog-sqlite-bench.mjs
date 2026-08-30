// What a materials catalog costs in plain SQLite, at the shapes Klippel needs.
// Mirrors the real row: ~12 attributes, 3 edges, ranked by usage, searched by
// name / colour / type / industry / externalId.
//
// The evidence behind `src/docs/analysis/materials-catalog-storage-options.md`.
// Run with:  node --experimental-sqlite scripts/devtools/catalog-sqlite-bench.mjs
// Needs Node 24 (`node:sqlite`). Reads are taken against a reopened database so
// nothing is warm in SQLite's page cache from the write.
import { DatabaseSync } from 'node:sqlite';
import { rmSync, statSync } from 'node:fs';

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

for (const N of COUNTS) {
  const path = `/tmp/klippel-catalog-bench-${N}.sqlite`;
  for (const suffix of ['', '-wal', '-shm']) {
    try { rmSync(path + suffix); } catch {}
  }

  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE materials (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      external_id TEXT,
      name TEXT,
      color TEXT,
      industry TEXT,
      usage_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      attrs TEXT NOT NULL
    );
    CREATE TABLE edges (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      type TEXT NOT NULL,
      target_id TEXT NOT NULL
    );
    CREATE INDEX edges_by_source ON edges(source_id);
    CREATE INDEX materials_rank ON materials(usage_count DESC, id ASC);
    CREATE INDEX materials_type_rank ON materials(type, usage_count DESC, id ASC);
    CREATE VIRTUAL TABLE materials_fts USING fts5(
      id UNINDEXED, haystack, tokenize='unicode61'
    );
  `);

  const insMat = db.prepare(
    `INSERT INTO materials (id,type,external_id,name,color,industry,usage_count,updated_at,attrs)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  );
  const insEdge = db.prepare(
    `INSERT INTO edges (id,source_id,type,target_id) VALUES (?,?,?,?)`,
  );
  const insFts = db.prepare(
    `INSERT INTO materials_fts (id,haystack) VALUES (?,?)`,
  );

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
      insMat.run(id, type, String(100000 + i), name, color, industry,
        i % 7, Date.now(), JSON.stringify(attrs));
      insEdge.run(`conformsTo:${id}`, id, 'conformsTo', `${type}@0.0.5`);
      insEdge.run(`manufacturedBy:${id}`, id, 'manufacturedBy', industry);
      insEdge.run(`suppliedBy:${id}:s1`, id, 'suppliedBy', 'seller-1');
      insFts.run(id, `${name} ${color} ${type} ${industry} ${100000 + i}`);
    }
    db.exec('COMMIT');
  });

  const bytes = statSync(path).size;

  // Cold read: reopen so nothing is in SQLite's page cache from the write.
  db.close();
  const cold = new DatabaseSync(path);

  const pageStmt = cold.prepare(
    `SELECT * FROM materials ORDER BY usage_count DESC, id ASC LIMIT 100 OFFSET ?`,
  );
  const [firstPageMs, firstPage] = ms(() => pageStmt.all(0));
  const [deepPageMs] = ms(() => pageStmt.all(Math.max(0, N - 200)));

  const edgesStmt = cold.prepare(
    `SELECT * FROM edges WHERE source_id IN (${firstPage.map(() => '?').join(',')})`,
  );
  const [pageEdgesMs, pageEdges] = ms(() => edgesStmt.all(...firstPage.map((r) => r.id)));

  const byId = cold.prepare(`SELECT * FROM materials WHERE id = ?`);
  const [byIdMs] = ms(() => byId.get(`mat-${Math.floor(N / 2)}`));

  const searchStmt = cold.prepare(
    `SELECT m.* FROM materials_fts f JOIN materials m ON m.id = f.id
     WHERE materials_fts MATCH ? ORDER BY m.usage_count DESC, m.id ASC LIMIT 100`,
  );
  const [searchMs, searchRows] = ms(() => searchStmt.all('royal linha'));
  const [countMs, counted] = ms(() =>
    cold.prepare(`SELECT count(*) AS n FROM materials`).get());

  const one = cold.prepare(`UPDATE materials SET name=?, updated_at=? WHERE id=?`);
  const [updateMs] = ms(() => one.run('novo nome', Date.now(), 'mat-42'));

  cold.close();

  console.log(JSON.stringify({
    rows: N,
    dbMB: +(bytes / 1e6).toFixed(1),
    bytesPerRow: Math.round(bytes / N),
    bulkWriteMs: Math.round(writeMs),
    rowsPerSec: Math.round(N / (writeMs / 1000)),
    firstPageMs: +firstPageMs.toFixed(2),
    deepPageMs: +deepPageMs.toFixed(2),
    pageEdgesMs: +pageEdgesMs.toFixed(2),
    pageEdgeRows: pageEdges.length,
    byIdMs: +byIdMs.toFixed(3),
    searchMs: +searchMs.toFixed(2),
    searchHits: searchRows.length,
    countMs: +countMs.toFixed(2),
    total: counted.n,
    updateMs: +updateMs.toFixed(3),
  }, null, 1));
}
