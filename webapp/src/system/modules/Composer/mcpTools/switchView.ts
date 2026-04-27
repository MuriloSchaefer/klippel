import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const switchViewTool = {
  name: 'switchView',
  description: 'Switch the active Composer ModelViewport between graph and SVG views.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      view: { type: 'string', enum: ['graph', 'svg'], description: "Target view mode: 'graph' or 'svg'." },
    },
    required: ['view'],
  },
  async execute({ view }: { view: 'graph' | 'svg' }) {
    const page = await getPage();
    await page.bringToFront();
    const selector = view === 'graph' ? '#composer-view-graph' : '#composer-view-svg';
    await page.click(selector);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
