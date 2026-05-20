/* istanbul ignore file */
import type { Page } from "puppeteer-core";

const NEW_WORKSPACE_TRIGGER_TESTID = "new-workspace-button";
const NEW_WORKSPACE_FORM_TESTID = "new-workspace-panel";
const NEW_WORKSPACE_NAME_TESTID = "new-workspace-name";
const NEW_WORKSPACE_CONFIRM_TESTID = "new-workspace-submit";

const formInputSelector = (testid: string) =>
  `[data-testid="${NEW_WORKSPACE_FORM_TESTID}"] [data-testid="${testid}"] input, [data-testid="${NEW_WORKSPACE_FORM_TESTID}"] [data-testid="${testid}"] textarea`;

export const openNewWorkspacePanel = async (page: Page) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(`[data-testid="${NEW_WORKSPACE_TRIGGER_TESTID}"]`);
  await page.click(`[data-testid="${NEW_WORKSPACE_TRIGGER_TESTID}"]`);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${NEW_WORKSPACE_FORM_TESTID}"]`,
  );
};

export const typeNewWorkspaceName = async (page: Page, name: string) => {
  const sel = formInputSelector(NEW_WORKSPACE_NAME_TESTID);
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Delete");
  await page.type(sel, name);
};

export const confirmNewWorkspace = async (page: Page) => {
  await page.waitForSelector(
    `[data-testid="${NEW_WORKSPACE_CONFIRM_TESTID}"]:not(:disabled)`,
  );
  await page.click(`[data-testid="${NEW_WORKSPACE_CONFIRM_TESTID}"]`);
  await page.waitForSelector(
    `[data-testid="${NEW_WORKSPACE_FORM_TESTID}"]`,
    { hidden: true },
  );
  // The Store middleware dispatches `selectWorkspace` after `workspaceCreated`,
  // which is async. The Share button enables only once
  // `workspaceCoIds[selectedWorkspace]` is populated — gate the driver on
  // that signal so the next action sees a fully-active workspace.
  await page.waitForSelector(
    '[data-testid="share-workspace-button"]:not(:disabled)',
  );
};
