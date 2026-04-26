import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const toggleKeyboardHintsShortcutTool = {
  name: 'toggleKeyboardHintsShortcut',
  description: 'Toggle keyboard shortcut hints visibility using the right Alt key (AltGraph).',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.press('AltGraph');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
