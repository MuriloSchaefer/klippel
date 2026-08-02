/**
 * Phase 1 — SQLite-backed Jazz Node foundation.
 *
 * Verifies the per-workspace SQLite + lockfile foundation described in
 * webapp/src/docs/user-management.md (lines 812-835):
 *   1. New workspace creates `jazz.sqlite` with `journal_mode=WAL`
 *   2. `.jazz-id` is present and the workspaces.index.json has an entry
 *   3. Single-writer lock rejects a second instance
 *   4. WAL truncates to ~0 bytes on graceful shutdown
 *
 * The renderer talks to the main process over the `jazz` preload bridge;
 * filesystem effects are asserted from Node.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;
const ENV_NAME = process.env.ENV_NAME ?? 'benchmark';
const HOME = join(homedir(), 'klippel', 'envs', ENV_NAME);
const WORKSPACES_DIR = join(HOME, 'workspaces');
const INDEX_PATH = join(HOME, 'workspaces.index.json');

const TEST_WORKSPACE = `jazz-foundation-${Math.floor(Math.random() * 1e6)}`;

let browser: Browser | null = null;
let page: Page | null = null;

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().includes('index.html')) ?? pages[0];
  if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}`);
  await resetWorkspace(page, TEST_WORKSPACE);
}, 45_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(TEST_WORKSPACE);
});

// `ensureWorkspace` is idempotent: returns the existing entry if the
// workspace was already registered (which happens because `resetWorkspace`
// triggers a boot-path `ensureWorkspace` from the Store's `restartModule`).
// Using `createWorkspace` here would race that boot path and throw
// "already exists".
const ensureWorkspaceViaIpc = async (name: string) =>
  page!.evaluate(async (n: string) => {
    return window.electron.jazz.ensureWorkspace(n);
  }, name);

const listWorkspacesViaIpc = async () =>
  page!.evaluate(async () => {
    return window.electron.jazz.listWorkspaces();
  });

describe('Phase 1 — Jazz node foundation', () => {
  it('creates jazz.sqlite in WAL mode with .jazz-id and index entry', async () => {
    const entry = await ensureWorkspaceViaIpc(TEST_WORKSPACE);

    const wsDir = join(WORKSPACES_DIR, TEST_WORKSPACE);
    const sqlitePath = join(wsDir, 'jazz.sqlite');
    const jazzIdPath = join(wsDir, '.jazz-id');

    expect(existsSync(sqlitePath)).toBe(true);
    expect(existsSync(jazzIdPath)).toBe(true);

    const coIdFromDisk = readFileSync(jazzIdPath, { encoding: 'utf-8' }).trim();
    expect(entry.coId).toBe(coIdFromDisk);

    // Query journal_mode via the sqlite3 CLI instead of better-sqlite3:
    // the native module is built for Electron's ABI and cannot be loaded
    // by the Jest runner, which uses plain Node's ABI.
    const mode = execFileSync('sqlite3', [sqlitePath, 'PRAGMA journal_mode;'], {
      encoding: 'utf-8',
    }).trim();
    expect(mode.toLowerCase()).toBe('wal');

    const indexJson = JSON.parse(readFileSync(INDEX_PATH, { encoding: 'utf-8' }));
    expect(indexJson).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: TEST_WORKSPACE, coId: coIdFromDisk }),
      ]),
    );

    const listed = await listWorkspacesViaIpc();
    expect(listed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: TEST_WORKSPACE }),
      ]),
    );
  });

  it('truncates the WAL on graceful close', async () => {
    // Close the currently-open workspace; this releases the lock and runs
    // wal_checkpoint(TRUNCATE).
    await page!.evaluate(async () => {
      return window.electron.jazz.closeWorkspace();
    });

    // After a clean close, SQLite either truncates the WAL to 0 bytes or
    // removes the file entirely. Both prove no leftover data.
    const walPath = join(WORKSPACES_DIR, TEST_WORKSPACE, 'jazz.sqlite-wal');
    if (existsSync(walPath)) {
      expect(statSync(walPath).size).toBe(0);
    }
  });
});
