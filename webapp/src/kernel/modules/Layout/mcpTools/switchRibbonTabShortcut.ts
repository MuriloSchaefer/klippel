import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const switchRibbonTabShortcutTool = {
  name: 'switchRibbonTabShortcut',
  description: 'Switch to a ribbon menu tab using the keyboard shortcut Alt+<tabIndex> (e.g. Alt+1 for first tab).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tabIndex: { type: 'number', description: '1-based index of the ribbon tab to activate (maps to Alt+<tabIndex>)' },
    },
    required: ['tabIndex'],
  },
  async execute({ tabIndex }: { tabIndex: number }) {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.down('Alt');
    await page.keyboard.press(`${tabIndex}`);
    await page.keyboard.up('Alt');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
