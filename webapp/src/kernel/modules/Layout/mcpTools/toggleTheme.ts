import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const toggleThemeTool = {
  name: 'toggleTheme',
  description: 'Toggle between light and dark theme by clicking the theme button in the system tray.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    const btn = await page.$('[aria-label="switch theme button"]');
    if (!btn) throw new Error('Theme toggle button not found');
    await btn.click();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
