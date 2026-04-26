import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const toggleThemeShortcutTool = {
  name: 'toggleThemeShortcut',
  description: 'Toggle between light and dark theme using the keyboard shortcut Ctrl+Shift+T.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('t');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
