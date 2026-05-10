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

  if (existsSync(SESSION_DIR)) {
    rmSync(SESSION_DIR, { recursive: true, force: true });
  }
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
