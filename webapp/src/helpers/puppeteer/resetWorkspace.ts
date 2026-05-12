/* istanbul ignore file */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Page } from 'puppeteer-core';

const ENV_NAME = process.env.ENV_NAME ?? process.env.KLIPPEL_ENV_NAME ?? 'small-app';
const HOME = join(homedir(), 'klippel', 'envs', ENV_NAME);
const WORKSPACES_DIR = join(HOME, 'workspaces');
const SESSION_DIR = join(HOME, '.session');
const STORE_STATE_FILE = join(SESSION_DIR, 'Store', 'state.json');

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
  if (base) {
    const baseDir = join(WORKSPACES_DIR, base);
    if (!existsSync(baseDir)) {
      throw new Error(`Base workspace "${base}" not found at ${baseDir}`);
    }
    cpSync(baseDir, targetDir, { recursive: true });
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
  if (base) {
    const baseDir = join(WORKSPACES_DIR, base);
    if (!existsSync(baseDir)) {
      throw new Error(`Base workspace "${base}" not found at ${baseDir}`);
    }
    cpSync(baseDir, targetDir, { recursive: true });
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
};
