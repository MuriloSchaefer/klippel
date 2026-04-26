import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const closeViewportShortcutTool = {
  name: 'closeViewportShortcut',
  description: 'Close the currently active viewport tab using the registered keyboard shortcut (Ctrl+W).',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.down('Control');
    await page.keyboard.press('w');
    await page.keyboard.up('Control');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
