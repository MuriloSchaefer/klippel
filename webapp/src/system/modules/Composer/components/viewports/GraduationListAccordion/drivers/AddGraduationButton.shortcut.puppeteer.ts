/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { ADD_GRADUATION_FORM_TESTID, ADD_GRADUATION_NAMES_TESTID } from './AddGraduationButton.click.puppeteer';

export const ADD_GRADUATION_SHORTCUT = 'a' as const;

export const triggerAddGraduation = async (page: Page) => {
  // 'a' is contextual: it opens the graduation panel only when focus is inside
  // the Graduações accordion, otherwise it opens the material panel. Callers
  // must focus a graduation row (or the accordion) before pressing.
  await page.keyboard.press(ADD_GRADUATION_SHORTCUT);
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ADD_GRADUATION_FORM_TESTID}"]`,
  );
  // Don't rely on autoFocus — explicitly focus the visible textarea so the
  // following keypresses always land in the controlled input.
  await page.evaluate((testId: string) => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>(
        `[role="pointer-panel-content"] [data-testid="${testId}"] textarea, [role="pointer-panel-content"] [data-testid="${testId}"] input`,
      ),
    );
    const target = nodes.find((n) => n.getAttribute('aria-hidden') !== 'true' && !n.hasAttribute('readonly')) ?? nodes[0];
    target?.focus();
  }, ADD_GRADUATION_NAMES_TESTID);
};

export const typeNamesAndConfirmFromFocused = async (page: Page, names: string) => {
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.keyboard.press('Delete');
  await page.keyboard.type(names);

  await page.keyboard.down('Control');
  await page.keyboard.press('Enter');
  await page.keyboard.up('Control');

  await page.waitForFunction(
    () => !document.querySelector('[role="pointer-panel-content"]'),
    { timeout: 5_000 },
  );
};
