import puppeteer, { type Page } from 'puppeteer-core';

// Port is read from env so this module works both inside Electron (set by main/index.ts)
// and as a standalone Node.js MCP server connecting to an already-running Electron instance.
const CDP_PORT = process.env.CDP_PORT ?? '9222';

let page: Page | null = null;

const isPageAlive = async (p: Page) => {
  if (p.isClosed()) return false;
  try {
    await p.evaluate(() => 1);
    return true;
  } catch {
    return false;
  }
};

export async function getPage(): Promise<Page> {
  if (page && (await isPageAlive(page))) return page;
  page = null;
  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${CDP_PORT}`,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  const candidates: Page[] = [];
  for (const p of pages) {
    if (p.isClosed()) continue;
    try {
      await p.evaluate(() => 1);
      candidates.push(p);
    } catch {
      // skip dead pages
    }
  }
  page = candidates.find((p) => p.url().startsWith('http://localhost:'))
    ?? candidates.find((p) => !p.url().startsWith('devtools://'))
    ?? candidates[0]
    ?? pages[0];
  return page;
}
