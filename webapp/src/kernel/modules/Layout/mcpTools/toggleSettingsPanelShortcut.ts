import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const toggleSettingsPanelShortcutTool = {
  name: 'toggleSettingsPanelShortcut',
  description: 'Toggle the settings panel (expand/collapse) using the keyboard shortcut Ctrl+B.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.down('Control');
    await page.keyboard.press('b');
    await page.keyboard.up('Control');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
