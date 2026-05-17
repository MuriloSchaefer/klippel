/* istanbul ignore file */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Page } from 'puppeteer-core';

const ENV_NAME = process.env.ENV_NAME ?? process.env.KLIPPEL_ENV_NAME ?? 'small-app';
const HOME = join(homedir(), 'klippel', 'envs', ENV_NAME);
const WORKSPACES_DIR = join(HOME, 'workspaces');
const SESSION_DIR = join(HOME, '.session');
const STORE_STATE_FILE = join(SESSION_DIR, 'Store', 'state.json');
const JAZZ_INDEX_FILE = join(HOME, 'workspaces.index.json');

/**
 * Remove any entry for `name` from `workspaces.index.json` so a freshly-reset
 * workspace is not mistaken for a pre-existing Jazz workspace. The renderer's
 * `selectWorkspace` middleware short-circuits the Jazz attach when the index
 * has no entry, and `jazz.createWorkspace` errors when the name is present —
 * so we want the index in a clean state before the page reload.
 */
const dropJazzIndexEntry = (name: string) => {
  if (!existsSync(JAZZ_INDEX_FILE)) return;
  try {
    const raw = readFileSync(JAZZ_INDEX_FILE, { encoding: 'utf-8' }).trim();
    if (!raw) return;
    const entries = JSON.parse(raw) as Array<{ name: string }>;
    if (!Array.isArray(entries)) return;
    const filtered = entries.filter((e) => e?.name !== name);
    if (filtered.length === entries.length) return;
    writeFileSync(JAZZ_INDEX_FILE, JSON.stringify(filtered, null, 2));
  } catch {
    // best-effort
  }
};

/**
 * After the renderer has reloaded onto the freshly-reset workspace, hand it
 * a registered Jazz workspace so domain IPC (`jazz-create-model`, etc.)
 * resolves against a real `activeWorkspace`. Uses the idempotent
 * `ensureWorkspace` IPC so we don't race the boot-path `ensureWorkspace`
 * fired from `Store/kernelcalls.ts`. Skips silently when the helper is run
 * against a build that hasn't yet exposed `window.electron.jazz`.
 */
const bootstrapJazzForWorkspace = async (page: Page, name: string) => {
  await page.evaluate(async (workspace: string) => {
    const jazz = (
      globalThis as unknown as {
        electron?: { jazz?: { ensureWorkspace?: (n: string) => Promise<unknown> } };
      }
    ).electron?.jazz;
    if (!jazz?.ensureWorkspace) return;
    try {
      await jazz.ensureWorkspace(workspace);
    } catch (err) {
      console.error('[resetWorkspace] jazz.ensureWorkspace failed', err);
    }
  }, name);
};

export const resetWorkspace = async (
  page: Page,
  target: string,
  base: string | undefined = process.env.BASE_WORKSPACE,
) => {
  // .session/<Module>/* now lives inside workspaces/<name>/.session/ (change
  // 2026-05-12-b26755). Wiping the target workspace dir wipes its session too;
  // copying the base workspace copies its session along. No separate session
  // teardown needed for non-Store modules.
  const targetDir = join(WORKSPACES_DIR, target);
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  dropJazzIndexEntry(target);
  if (base) {
    const baseDir = join(WORKSPACES_DIR, base);
    if (existsSync(baseDir)) {
      cpSync(baseDir, targetDir, { recursive: true });
    } else {
      // Base workspace doesn't exist in this env — fall back to a blank
      // workspace. Useful in fresh dev envs where `BASE_WORKSPACE=empty` is
      // set by the npm script but the env hasn't been seeded yet.
      mkdirSync(targetDir, { recursive: true });
    }
  } else {
    mkdirSync(targetDir, { recursive: true });
  }

  // Store stays at env root — it's the workspace registry, loaded synchronously
  // before any workspace context exists. Point it at the new workspace.
  mkdirSync(dirname(STORE_STATE_FILE), { recursive: true });
  writeFileSync(
    STORE_STATE_FILE,
    JSON.stringify({ selectedWorkspace: target, workspaces: [target] }),
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 30_000 });
  await bootstrapJazzForWorkspace(page, target);
};

export const cleanupWorkspace = (target: string) => {
  const targetDir = join(WORKSPACES_DIR, target);
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
};

// Soft variant: prepares the target workspace on disk (same as resetWorkspace)
// but switches to it via a dispatched selectWorkspace action instead of
// page.reload(). Requires the renderer to have exposed `__klippelStore__`
// (DynamicStore does so unconditionally) and every persisted slice to have
// registered a rehydrator (so the workspaceSelected listener can swap each
// slice's state to the new workspace's `.session/` contents).
export const softResetWorkspace = async (
  page: Page,
  target: string,
  base: string | undefined = process.env.BASE_WORKSPACE,
) => {
  const targetDir = join(WORKSPACES_DIR, target);
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  dropJazzIndexEntry(target);
  if (base) {
    const baseDir = join(WORKSPACES_DIR, base);
    if (existsSync(baseDir)) {
      cpSync(baseDir, targetDir, { recursive: true });
    } else {
      mkdirSync(targetDir, { recursive: true });
    }
  } else {
    mkdirSync(targetDir, { recursive: true });
  }

  // Keep the env-root pointer up-to-date so a future cold boot would land on
  // this workspace. Not strictly required for the soft path (we dispatch
  // selectWorkspace), but keeps disk and Redux state coherent.
  mkdirSync(dirname(STORE_STATE_FILE), { recursive: true });
  writeFileSync(
    STORE_STATE_FILE,
    JSON.stringify({ selectedWorkspace: target, workspaces: [target] }),
  );

  // Dispatch the selectWorkspace action; the Store middleware sets the
  // workspaceScope cache, runs every registered rehydrator against the new
  // workspace's `.session/`, dispatches per-slice rehydrate actions, then
  // emits workspaceSelected. Wait for the dispatch promise to resolve.
  await page.evaluate(async (workspace: string) => {
    const s = (globalThis as unknown as {
      __klippelStore__?: {
        dispatch: (action: { type: string; payload?: unknown }) => unknown;
      };
    }).__klippelStore__;
    if (!s) throw new Error('softResetWorkspace: __klippelStore__ not exposed on window');
    await s.dispatch({
      type: '[Store:Command] Select workspace',
      payload: { workspace },
    });
  }, target);

  // The rehydrators run async inside the listener; give the listener a tick
  // to complete dispatching slice rehydrate actions before tests inspect UI.
  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 10_000 });
  await bootstrapJazzForWorkspace(page, target);
};
