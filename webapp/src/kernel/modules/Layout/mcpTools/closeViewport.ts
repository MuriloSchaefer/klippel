import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const closeViewportTool = {
  name: 'closeViewport',
  description: 'Close the currently active viewport tab by clicking its close button.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    const activeTab = await page.$('[role="viewport-tabs"] [aria-selected="true"]');
    if (!activeTab) throw new Error('No active viewport tab found');
    const closeBtn = await activeTab.$('[data-testid="close-viewport-btn"]');
    if (!closeBtn) throw new Error('Close button not found on active tab');
    await closeBtn.click();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
