/* istanbul ignore file */
import type { Page } from 'puppeteer-core';
import { PROCESS_ITEM_TESTID } from './ProcessItem.click.puppeteer';
import { dragPointerPanelIntoView } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';

export const PROCESS_ITEM_LINK_ELECTIVE_TESTID = 'process-item-link-elective';
export const LINK_ELECTIVE_FORM_TESTID = 'link-elective-form';
export const LINK_ELECTIVE_SELECT_TESTID = 'link-elective-select';
export const LINK_ELECTIVE_CONFIRM_TESTID = 'link-elective-confirm';

const rowSelector = (label: string) =>
  `[data-testid="${PROCESS_ITEM_TESTID}"][data-process-label="${label}"]`;

export const clickProcessLinkElective = async (page: Page, label: string) => {
  const sel = `${rowSelector(label)} [data-testid="${PROCESS_ITEM_LINK_ELECTIVE_TESTID}"]`;
  await page.waitForSelector(sel);
  // MUI Tooltip wraps this IconButton; PointerContainer attaches its open
  // handler via cloneElement on the Tooltip. A real mouse click delivered on
  // the inner SVG bubbles through Tooltip's instrumented handlers in a way
  // that doesn't fire that onClick, but a programmatic HTMLElement.click()
  // does — same path the keyboard shortcut takes.
  await page.$eval(sel, (el) => (el as HTMLButtonElement).click());
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${LINK_ELECTIVE_FORM_TESTID}"]`,
  );
  // The panel is anchored at the row, which can sit near the viewport edge —
  // drag it fully on-screen so the select/confirm controls are clickable.
  await dragPointerPanelIntoView(page);
};

export const selectLinkElectiveOption = async (
  page: Page,
  electiveLabel: string,
) => {
  const selectSel = `[role="pointer-panel-content"] [data-testid="${LINK_ELECTIVE_FORM_TESTID}"] [data-testid="${LINK_ELECTIVE_SELECT_TESTID}"]`;
  await page.waitForSelector(selectSel);
  await page.click(selectSel);
  const optionSel = `[role="listbox"] [data-testid="link-elective-option-${electiveLabel}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

export const waitForProcessLinkedTo = async (
  page: Page,
  processLabel: string,
  electiveLabel: string,
  timeout = 5_000,
) => {
  await page.waitForFunction(
    (args: { row: string; expected: string }) => {
      const row = document.querySelector(args.row);
      if (!row) return false;
      const chips = row.querySelectorAll('.MuiChip-label');
      for (const chip of Array.from(chips)) {
        if ((chip.textContent ?? '').trim() === args.expected) return true;
      }
      return false;
    },
    { timeout },
    { row: rowSelector(processLabel), expected: electiveLabel },
  );
};
