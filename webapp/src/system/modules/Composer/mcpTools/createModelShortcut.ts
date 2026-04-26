import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const createModelShortcutTool = {
  name: 'createModelShortcut',
  description: 'Open the create-model panel using the registered keyboard shortcut (Alt+Q).',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.down('Alt');
    await page.keyboard.press('q');
    await page.keyboard.up('Alt');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
