import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const addViewportShortcutTool = {
  name: 'addViewportShortcut',
  description: 'Add a new viewport tab using the keyboard shortcut Ctrl+N.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.down('Control');
    await page.keyboard.press('n');
    await page.keyboard.up('Control');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
