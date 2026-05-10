import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { clickViewportTabByIndex } from '../components/ViewportManager/drivers/ViewportTabs.click.puppeteer';

export const switchViewportTool = {
  name: 'switchViewport',
  description: 'Switch to a viewport tab by its 1-based index, excluding the home tab (e.g. 1 = first open viewport).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      viewportIndex: { type: 'number', description: '1-based index of the viewport to activate (home tab not counted)' },
    },
    required: ['viewportIndex'],
  },
  async execute({ viewportIndex }: { viewportIndex: number }) {
    const page = await getPage();
    const clicked = await clickViewportTabByIndex(page, viewportIndex);
    if (!clicked) throw new Error(`Viewport at index ${viewportIndex} not found`);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
