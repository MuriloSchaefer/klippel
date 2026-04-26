import { getPage } from '../../../../../electron/main/mcp/puppeteer';

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
    const clicked = await page.evaluate((index: number) => {
      const tabsRoot = document.querySelector('[role="viewport-tabs"]');
      if (!tabsRoot) return false;
      const allTabs = Array.from(tabsRoot.querySelectorAll('[role="tab"]'));
      const viewportTabs = allTabs.filter(
        (el) => el.id !== 'home' && el.id !== 'new-viewport',
      );
      const target = viewportTabs[index - 1] as HTMLElement | undefined;
      if (!target) return false;
      target.click();
      return true;
    }, viewportIndex);
    if (!clicked) throw new Error(`Viewport at index ${viewportIndex} not found`);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
