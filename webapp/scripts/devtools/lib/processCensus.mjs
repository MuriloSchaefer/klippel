/**
 * Process census for the e2e headless leak investigation
 * (see src/docs/analysis/e2e-headless-memory-leak.md §3).
 *
 * Read-only `ps` snapshot of the process table, filtered to the processes the
 * e2e harness spawns (Xvfb, Electron + its child types, the vite/esbuild dev
 * server, the jazz-run sync server). "Orphans" are matches whose parent is
 * `parentPid` (default 1 / init) — i.e. processes re-parented after their
 * spawner died, which is the signature of the teardown leak.
 *
 * Used by monitor-orphans.mjs (continuous sampling) and repeat-tests.mjs
 * (per-iteration before/after snapshots). Pure measurement — no signals sent.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const categorize = (args) => {
  if (/Xvfb/.test(args)) return 'Xvfb';
  if (/--type=renderer/.test(args)) return 'electron-renderer';
  if (/--type=gpu-process/.test(args) || /--type=gpu\b/.test(args)) return 'electron-gpu';
  if (/--type=utility/.test(args)) return 'electron-utility';
  if (/--type=zygote/.test(args)) return 'electron-zygote';
  if (/electron/.test(args)) return 'electron-main';
  if (/esbuild/.test(args)) return 'esbuild';
  if (/jazz-run/.test(args)) return 'jazz-run';
  if (/\bvite\b|electron-vite/.test(args)) return 'vite';
  return 'other';
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Match only the *project's* harness processes, so the editor's own Electron
 * (this runs inside VS Code, which is Electron too) doesn't pollute the count.
 *   - Xvfb / jazz-run: always test-related on this box.
 *   - electron / vite / esbuild: only when the argv references `repoPath`
 *     (the project's node_modules/dist), which the editor's binary never does.
 * When `repoPath` is omitted, electron/vite/esbuild match unscoped (noisier).
 *
 * NOTE: leaked test Electrons are NOT always re-parented to init — their
 * `xvfb-run` ancestry can stay partly alive — so the headline signal is the
 * project-scoped process count itself (≈0 when idle), with ppid==parentPid
 * tracked separately as the strict-orphan subset.
 */
const buildMatcher = (repoPath) => {
  const scoped = repoPath ? new RegExp(escapeRe(repoPath)) : null;
  const inRepo = (args) => !scoped || scoped.test(args);
  return (args) => {
    if (/Xvfb/.test(args)) return true;
    if (/jazz-run/.test(args)) return inRepo(args);
    if (/electron/.test(args)) return inRepo(args);
    if (/esbuild|\bvite\b|electron-vite/.test(args)) return inRepo(args);
    return false;
  };
};

/**
 * Take one snapshot. Returns counts, RSS totals (GiB), thread totals, an
 * Xvfb-display-lock count, and the raw rows for detailed logging.
 *
 * @param {{ repoPath?: string, parentPid?: number }} [opts]
 *   repoPath  — absolute path used to scope electron/vite matches to the project
 *   parentPid — pid that re-parented orphans hang off (default 1 / init)
 */
export const snapshot = ({ repoPath, parentPid = 1 } = {}) => {
  const matches = buildMatcher(repoPath);
  const res = spawnSync('ps', ['-eo', 'pid=,ppid=,rss=,nlwp=,args='], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  const rows = [];
  for (const line of (res.stdout ?? '').split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/);
    if (!m) continue;
    const [, pid, ppid, rss, nlwp, args] = m;
    if (!matches(args)) continue;
    rows.push({
      pid: +pid,
      ppid: +ppid,
      rssKb: +rss,
      threads: +nlwp,
      comm: categorize(args),
      args,
    });
  }

  const orphans = rows.filter((r) => r.ppid === parentPid);
  const byComm = {};
  for (const r of rows) byComm[r.comm] = (byComm[r.comm] ?? 0) + 1;

  let xlocks = 0;
  try {
    xlocks = readdirSync('/tmp').filter((f) => /^\.X\d+-lock$/.test(f)).length;
  } catch {
    /* /tmp unreadable — leave 0 */
  }

  const sumRss = (a) => a.reduce((s, r) => s + r.rssKb, 0);
  const sumThreads = (a) => a.reduce((s, r) => s + r.threads, 0);

  return {
    ts: new Date().toISOString(),
    procCount: rows.length, // project-scoped harness processes (≈0 when idle)
    orphanCount: orphans.length, // strict subset re-parented to parentPid
    procRssGiB: +(sumRss(rows) / 1024 / 1024).toFixed(2),
    orphanRssGiB: +(sumRss(orphans) / 1024 / 1024).toFixed(2),
    procThreads: sumThreads(rows),
    byComm,
    xlocks,
    rows,
  };
};

/** One-line summary suitable for a rolling monitor log. */
export const formatLine = (s) => {
  const breakdown = Object.entries(s.byComm)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}×${v}`)
    .join(' ');
  return (
    `${s.ts}  procs=${s.procCount} rss=${s.procRssGiB}GiB threads=${s.procThreads} ` +
    `xlocks=${s.xlocks} orphans(ppid=1)=${s.orphanCount}` +
    (breakdown ? `  [${breakdown}]` : '')
  );
};
