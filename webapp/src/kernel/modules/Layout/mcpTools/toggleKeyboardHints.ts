import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const toggleKeyboardHintsTool = {
  name: 'toggleKeyboardHints',
  description: 'Toggle keyboard shortcut hints visibility by clicking the keyboard icon in the system tray.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    const btn = await page.$('[aria-label="toggle keyboard shortcuts visibility"]');
    if (!btn) throw new Error('Keyboard hints toggle button not found');
    await btn.click();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
