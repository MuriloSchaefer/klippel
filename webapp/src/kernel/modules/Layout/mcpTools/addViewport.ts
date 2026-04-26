import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const addViewportTool = {
  name: 'addViewport',
  description: 'Add a new viewport tab by clicking the + button in the viewport tab bar.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    const btn = await page.$('#new-viewport');
    if (!btn) throw new Error('Add viewport button not found');
    await btn.click();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
