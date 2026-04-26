import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const toggleDetailsPanelTool = {
  name: 'toggleDetailsPanel',
  description: 'Close the details panel by clicking its close button. The panel must be open for this to work.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    const btn = await page.$('[aria-label="close details panel"]');
    if (!btn) throw new Error('Details panel close button not found (panel may already be closed)');
    await btn.click();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
