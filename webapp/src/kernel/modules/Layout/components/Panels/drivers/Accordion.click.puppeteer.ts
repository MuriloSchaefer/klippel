/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

const accordionSelector = (name: string) => `[role="accordion-${name}"]`;
const summarySelector = (name: string) =>
  `${accordionSelector(name)} [aria-controls="accordion-${name}-content"]`;

/**
 * Expand and wait for the open transition to *settle*. `aria-expanded="true"`
 * flips ~300ms before the MUI Collapse finishes, and the accordion's
 * `focusOnOpen` runs at the end of that transition — returning early lets it
 * land in the middle of whatever the caller does next (stealing focus from a
 * panel input mid-type). `data-accordion-state` mirrors the transition.
 */
export const expandAccordion = async (page: Page, name: string) => {
  const accordion = accordionSelector(name);
  const summary = summarySelector(name);
  await page.waitForSelector(accordion);
  const expanded = await page.$eval(summary, (el) => el.getAttribute('aria-expanded') === 'true');
  if (!expanded) {
    await page.click(summary);
    await page.waitForSelector(`${summary}[aria-expanded="true"]`);
  }
  // Also covers the already-expanded-but-still-animating case.
  await page.waitForSelector(`${accordion}[data-accordion-state="entered"]`);
};

export const collapseAccordion = async (page: Page, name: string) => {
  const accordion = accordionSelector(name);
  const summary = summarySelector(name);
  await page.waitForSelector(summary);
  const expanded = await page.$eval(summary, (el) => el.getAttribute('aria-expanded') === 'true');
  if (expanded) {
    await page.click(summary);
    await page.waitForSelector(`${summary}:not([aria-expanded="true"])`);
  }
  // Settle the close transition, so a following expand starts from a clean
  // state (and never matches a stale `entered`).
  await page.waitForSelector(`${accordion}[data-accordion-state="collapsed"]`);
};
