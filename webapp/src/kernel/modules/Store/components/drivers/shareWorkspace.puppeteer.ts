/* istanbul ignore file */
import type { Page } from "puppeteer-core";

const SHARE_WORKSPACE_TRIGGER_TESTID = "share-workspace-button";
const SHARE_WORKSPACE_FORM_TESTID = "share-workspace-panel";
const SHARE_WORKSPACE_CONFIRM_TESTID = "share-workspace-confirm";

export const openShareWorkspacePanel = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(
    `[data-testid="${SHARE_WORKSPACE_TRIGGER_TESTID}"]:not(:disabled)`,
  );
  await page.click(`[data-testid="${SHARE_WORKSPACE_TRIGGER_TESTID}"]`);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${SHARE_WORKSPACE_FORM_TESTID}"]`,
  );
};

/**
 * Read the coId + syncUrl + invite the Share panel displays. The panel
 * exposes them as `data-share-*` mirrors on the form root so a single
 * `getAttribute` call avoids racing the underlying `<input>` value state.
 */
export const readShareWorkspaceAttrs = async (
  page: Page,
): Promise<{ coId: string; syncUrl: string }> => {
  const sel = `[data-testid="${SHARE_WORKSPACE_FORM_TESTID}"]`;
  await page.waitForSelector(sel);
  return page.$eval(sel, (el) => ({
    coId: el.getAttribute("data-share-coid") ?? "",
    syncUrl: el.getAttribute("data-share-sync-url") ?? "",
  }));
};

export const confirmShareWorkspace = async (page: Page) => {
  await page.waitForSelector(
    `[data-testid="${SHARE_WORKSPACE_CONFIRM_TESTID}"]:not(:disabled)`,
  );
  await page.click(`[data-testid="${SHARE_WORKSPACE_CONFIRM_TESTID}"]`);
  await page.waitForSelector(
    `[data-testid="${SHARE_WORKSPACE_FORM_TESTID}"]`,
    { hidden: true },
  );
};
