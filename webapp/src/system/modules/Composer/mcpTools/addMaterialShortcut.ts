import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const addMaterialShortcutTool = {
  name: 'addMaterialShortcut',
  description: 'Open the add-material panel in the active Composer ModelViewport using the registered keyboard shortcut (m).',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.press('m');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
