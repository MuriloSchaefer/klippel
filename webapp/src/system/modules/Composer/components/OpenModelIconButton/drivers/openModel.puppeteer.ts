/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

// Click a model option in the open-model modal. Waits for the option to
// appear (the list is rendered asynchronously after the modal mounts), then
// dispatches a real click via element.click() — `dispatchEvent(MouseEvent)`
// is an untrusted event some React handlers ignore, which manifests as the
// search/list showing the option but `selectedOption` staying null.
//
// The option element's `id` attribute is the model name, which can contain
// spaces (e.g. "E2E e2e-86338"). CSS.escape is meant for unquoted contexts
// and produces escapes that don't match inside a quoted attribute selector,
// so we match in JS instead (same approach as the original $$eval).
export const clickModelOptionByName = async (
  page: Page,
  modelName: string,
): Promise<boolean> => {
  try {
    await page.waitForFunction(
      (name: string) =>
        !!document
          .querySelector('[role="list-options"]')
          ?.querySelector(`[id]`) &&
        Array.from(
          document.querySelectorAll('[role="list-options"] [id]'),
        ).some((el) => el.getAttribute('id') === name),
      { timeout: 5_000 },
      modelName,
    );
  } catch {
    return false;
  }
  const clicked = await page.$$eval(
    '[role="list-options"] [id]',
    (els, name) => {
      const el = els.find((e) => e.getAttribute('id') === name);
      if (!el) return false;
      (el as HTMLElement).click();
      return true;
    },
    modelName,
  );
  return clicked;
};

export const waitForConfirmModelSelectionEnabled = (page: Page) =>
  page.waitForSelector('[aria-label="confirm-model-selection"]:not(:disabled)');

export const waitForModalClosed = (page: Page) =>
  page.waitForSelector('#modal-content', { hidden: true }).catch(() => {});
