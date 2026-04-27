import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const switchViewShortcutTool = {
  name: 'switchViewShortcut',
  description: 'Switch the active Composer ModelViewport view using the registered keyboard shortcut (1 = graph, 2 = svg).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      view: { type: 'string', enum: ['graph', 'svg'], description: "Target view mode: 'graph' (key 1) or 'svg' (key 2)." },
    },
    required: ['view'],
  },
  async execute({ view }: { view: 'graph' | 'svg' }) {
    const page = await getPage();
    await page.bringToFront();
    await page.keyboard.press(view === 'graph' ? '1' : '2');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
