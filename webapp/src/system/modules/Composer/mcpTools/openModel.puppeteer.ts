/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

export const clickModelOptionByName = (page: Page, modelName: string): Promise<boolean> =>
  page.$$eval(
    '[role="list-options"] [id]',
    (els, name) => {
      const el = els.find((e) => e.getAttribute('id') === name);
      if (el) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
      }
      return false;
    },
    modelName,
  );

export const waitForConfirmModelSelectionEnabled = (page: Page) =>
  page.waitForFunction(
    () => !document.querySelector('[aria-label="confirm-model-selection"]:disabled'),
  );

export const waitForModalClosed = (page: Page) =>
  page
    .waitForFunction(() => !document.getElementById('modal-content'), { timeout: 5000 })
    .catch(() => {});
