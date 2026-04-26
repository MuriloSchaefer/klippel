import puppeteer, { type Page } from 'puppeteer-core';

// Port is read from env so this module works both inside Electron (set by main/index.ts)
// and as a standalone Node.js MCP server connecting to an already-running Electron instance.
const CDP_PORT = process.env.CDP_PORT ?? '9222';

let page: Page | null = null;

export async function getPage(): Promise<Page> {
  if (page) return page;
  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${CDP_PORT}`,
    defaultViewport: null,
  });
  page = (await browser.pages())[0];
  return page;
}
