import { getPage } from '../../../../../electron/main/mcp/puppeteer';

export const switchRibbonTabTool = {
  name: 'switchRibbonTab',
  description: 'Switch to a ribbon menu tab by its 1-based index (e.g. 1 = first tab, 2 = second tab).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tabIndex: { type: 'number', description: '1-based index of the ribbon tab to activate' },
    },
    required: ['tabIndex'],
  },
  async execute({ tabIndex }: { tabIndex: number }) {
    const page = await getPage();
    const clicked = await page.evaluate((index: number) => {
      const id = `Layout/RibbonMenu/${index - 1}`;
      const el = document.getElementById(id) as HTMLElement | null;
      if (!el) return false;
      el.click();
      return true;
    }, tabIndex);
    if (!clicked) throw new Error(`Ribbon tab at index ${tabIndex} not found`);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
