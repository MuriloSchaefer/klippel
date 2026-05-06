import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const toggleDetailsPanelShortcutTool = {
  name: 'toggleDetailsPanelShortcut',
  description: 'Toggle the details panel (open/close) using the keyboard shortcut Ctrl+Alt+B.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.down('Control');
    await page.keyboard.down('Alt');
    await page.keyboard.press('b');
    await page.keyboard.up('Alt');
    await page.keyboard.up('Control');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
