import { z } from 'zod';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const switchViewTool = {
  name: 'switchView',
  description: 'Switch the active Composer ModelViewport between graph and SVG views.',
  inputSchema: {
    view: z.enum(['graph', 'svg']).describe("Target view mode: 'graph' or 'svg'."),
  },
  async execute({ view }: { view: 'graph' | 'svg' }) {
    const page = await getPage();
    await page.bringToFront();
    const selector = view === 'graph' ? '#composer-view-graph' : '#composer-view-svg';
    await page.click(selector);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
