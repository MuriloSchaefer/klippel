/* istanbul ignore file */
import type { Page } from "puppeteer-core";

const JOIN_WORKSPACE_TRIGGER_TESTID = "join-workspace-button";
const JOIN_WORKSPACE_FORM_TESTID = "join-workspace-panel";
const JOIN_WORKSPACE_COID_TESTID = "join-workspace-coid";
const JOIN_WORKSPACE_SYNC_URL_TESTID = "join-workspace-sync-url";
const JOIN_WORKSPACE_NAME_TESTID = "join-workspace-name";
const JOIN_WORKSPACE_CONFIRM_TESTID = "join-workspace-submit";

const formInputSelector = (testid: string) =>
  `[data-testid="${JOIN_WORKSPACE_FORM_TESTID}"] [data-testid="${testid}"] input, [data-testid="${JOIN_WORKSPACE_FORM_TESTID}"] [data-testid="${testid}"] textarea`;

export const openJoinWorkspacePanel = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(`[data-testid="${JOIN_WORKSPACE_TRIGGER_TESTID}"]`);
  await page.click(`[data-testid="${JOIN_WORKSPACE_TRIGGER_TESTID}"]`);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${JOIN_WORKSPACE_FORM_TESTID}"]`,
  );
};

const typeIntoField = async (page: Page, testId: string, value: string) => {
  const sel = formInputSelector(testId);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Delete");
  await page.type(sel, value);
};

export const fillJoinWorkspaceForm = async (
  page: Page,
  input: { coId: string; syncUrl: string; name: string },
) => {
  await typeIntoField(page, JOIN_WORKSPACE_COID_TESTID, input.coId);
  await typeIntoField(page, JOIN_WORKSPACE_SYNC_URL_TESTID, input.syncUrl);
  await typeIntoField(page, JOIN_WORKSPACE_NAME_TESTID, input.name);
};

export const confirmJoinWorkspace = async (page: Page) => {
  await page.waitForSelector(
    `[data-testid="${JOIN_WORKSPACE_CONFIRM_TESTID}"]:not(:disabled)`,
  );
  await page.click(`[data-testid="${JOIN_WORKSPACE_CONFIRM_TESTID}"]`);
  await page.waitForSelector(
    `[data-testid="${JOIN_WORKSPACE_FORM_TESTID}"]`,
    { hidden: true },
  );
  // The middleware dispatch chain (jazz.joinWorkspace → selectWorkspace
  // → ensureWorkspace) is async; the panel closes the instant the form
  // submits. The Share button enables only once `workspaceCoIds` has
  // the joined entry, which is the deterministic post-join readiness
  // signal — wait on it so the next step sees a fully-active workspace.
  await page.waitForSelector(
    '[data-testid="share-workspace-button"]:not(:disabled)',
  );
};
