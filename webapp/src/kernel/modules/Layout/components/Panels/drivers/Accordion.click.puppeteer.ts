/* istanbul ignore file */
import type { Page } from 'puppeteer-core';

const accordionSelector = (name: string) => `[role="accordion-${name}"]`;
const summarySelector = (name: string) =>
  `${accordionSelector(name)} [aria-controls="accordion-${name}-content"]`;

export const expandAccordion = async (page: Page, name: string) => {
  const accordion = accordionSelector(name);
  const summary = summarySelector(name);
  await page.waitForSelector(accordion);
  const expanded = await page.$eval(summary, (el) => el.getAttribute('aria-expanded') === 'true');
  if (expanded) return;
  await page.click(summary);
  await page.waitForSelector(`${summary}[aria-expanded="true"]`);
};

export const collapseAccordion = async (page: Page, name: string) => {
  const summary = summarySelector(name);
  await page.waitForSelector(summary);
  const expanded = await page.$eval(summary, (el) => el.getAttribute('aria-expanded') === 'true');
  if (!expanded) return;
  await page.click(summary);
  await page.waitForSelector(`${summary}:not([aria-expanded="true"])`);
};
