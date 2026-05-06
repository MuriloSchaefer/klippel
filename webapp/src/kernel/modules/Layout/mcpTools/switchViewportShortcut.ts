import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const switchViewportShortcutTool = {
  name: 'switchViewportShortcut',
  description: 'Switch to a viewport tab using the keyboard shortcut Ctrl+<viewportIndex> (e.g. Ctrl+1 for first viewport).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      viewportIndex: { type: 'number', description: '1-based index of the viewport to activate (maps to Ctrl+<viewportIndex>)' },
    },
    required: ['viewportIndex'],
  },
  async execute({ viewportIndex }: { viewportIndex: number }) {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.down('Control');
    await page.keyboard.press(`${viewportIndex}` as any);
    await page.keyboard.up('Control');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
