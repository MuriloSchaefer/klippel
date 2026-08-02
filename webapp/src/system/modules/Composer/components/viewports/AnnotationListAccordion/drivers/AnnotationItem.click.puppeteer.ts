/* istanbul ignore file */
import type { ElementHandle, Page } from 'puppeteer-core';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import { ANNOTATION_ITEM_TESTID } from './AddAnnotationButton.click.puppeteer';

export const ANNOTATION_NAME_TESTID = 'annotation-name';
export const ANNOTATION_TEXT_FIELD_TESTID = 'annotation-text';
export const ANNOTATION_DELETE_TESTID = 'annotation-item-delete';
export const ANNOTATION_SELECT_TESTID = 'annotation-item-select';
export const ANNOTATION_LINK_ELECTIVE_TESTID = 'annotation-item-link-elective';
export const ANNOTATION_LINK_ELECTIVE_PANEL_TESTID = 'annotation-link-elective';
export const ANNOTATION_LINK_ELECTIVE_SELECT_TESTID =
  'annotation-link-elective-select';

export const annotationItemSelector = (label: string) =>
  `[data-testid="${ANNOTATION_ITEM_TESTID}"][data-annotation-label="${label}"]`;

export const waitForAnnotationItem = (page: Page, label: string) =>
  page.waitForSelector(annotationItemSelector(label));

export const waitForAnnotationItemRemoved = (page: Page, label: string) =>
  page.waitForSelector(annotationItemSelector(label), { hidden: true });

const fieldSel = (label: string, testid: string) =>
  `${annotationItemSelector(label)} [data-testid="${testid}"] input, ${annotationItemSelector(label)} [data-testid="${testid}"] textarea`;

// Set the full field value in one shot via the native value setter + a single
// `input` event, instead of simulated per-key typing. These row fields (title +
// body) dispatch to the store on every keystroke and render as controlled MUI
// inputs; the per-keystroke store round-trip re-renders the input against a
// lagging value, which under load drops characters and can even misroute focus
// mid-word. A single input event fires exactly one React `onChange` with the
// complete value — deterministic and load-independent — while still exercising
// the real onChange → store → editor-render path the tests assert on. (Ctrl+A
// select-all is also swallowed by the app's keyboard manager in this focus
// context, so a keyboard clear is unreliable here regardless.)
const setFieldValue = async (
  handle: ElementHandle<Element>,
  value: string,
) => {
  await handle.evaluate((el, v) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    const proto =
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
    setter.call(input, v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
};

const fieldHandle = async (page: Page, label: string, testid: string) => {
  const sel = fieldSel(label, testid);
  const handle = (await page.waitForSelector(sel)) as ElementHandle<Element> | null;
  if (!handle) throw new Error(`annotation field not found: ${sel}`);
  return handle;
};

/** Rename by typing into the row's title field. The row's data-annotation-label
 * follows the new value, so wait for the renamed row to appear. */
export const renameAnnotation = async (
  page: Page,
  oldLabel: string,
  newLabel: string,
) => {
  const handle = await fieldHandle(page, oldLabel, ANNOTATION_NAME_TESTID);
  await setFieldValue(handle, newLabel);
  await waitForAnnotationItem(page, newLabel);
};

/** Set the body text. Waits until the injected editor <text> reflects the value. */
export const setAnnotationText = async (
  page: Page,
  label: string,
  text: string,
) => {
  const handle = await fieldHandle(page, label, ANNOTATION_TEXT_FIELD_TESTID);
  await setFieldValue(handle, text);
  // First line lands in the first <tspan>; assert it propagated to the editor.
  const firstLine = text.split('\n')[0];
  await page.waitForFunction(
    (line: string) => {
      const t = document.querySelector('#svg-editor text[id^="annotation-text-"] tspan');
      return (t?.textContent ?? '').trim() === line.trim();
    },
    {},
    firstLine,
  );
};

export const deleteAnnotationByLabel = async (page: Page, label: string) => {
  const sel = `${annotationItemSelector(label)} [data-testid="${ANNOTATION_DELETE_TESTID}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await waitForAnnotationItemRemoved(page, label);
};

export const openAnnotationLinkElective = async (page: Page, label: string) => {
  const trigger = `${annotationItemSelector(label)} [data-testid="${ANNOTATION_LINK_ELECTIVE_TESTID}"]`;
  await page.waitForSelector(trigger);
  // Programmatic click (hit-test bypass, e2e-tests.md §5): the trigger IconButton
  // is wrapped in a ShortcutHint MUI Tooltip, whose synthetic bubbling swallows a
  // positional page.click's onClick so the PointerContainer never opens.
  await page.$eval(trigger, (el) => (el as HTMLElement).click());
  await page.waitForSelector(
    `[role="pointer-panel-content"] [data-testid="${ANNOTATION_LINK_ELECTIVE_PANEL_TESTID}"]`,
  );
};

export const selectAnnotationElectiveOption = async (
  page: Page,
  electiveLabel: string,
) => {
  const selectSel = `[role="pointer-panel-content"] [data-testid="${ANNOTATION_LINK_ELECTIVE_SELECT_TESTID}"]`;
  await page.waitForSelector(selectSel);
  await page.click(selectSel);
  const optionSel = `[role="listbox"] [data-testid="annotation-link-elective-option-${electiveLabel}"]`;
  await page.waitForSelector(optionSel);
  await page.click(optionSel);
  await page.waitForSelector('[role="listbox"]', { hidden: true });
};

export const confirmAnnotationLinkElective = (page: Page) =>
  confirmPointerPanel(page);
