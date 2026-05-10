import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { clickRibbonTab } from './drivers/switchRibbonTab.puppeteer';

export const switchRibbonTabTool = {
  name: 'switchRibbonTab',
  description: 'Switch to a ribbon menu tab by its 1-based index or by its visible label.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      tabIndex: { type: 'number', description: '1-based index of the ribbon tab to activate' },
      label: { type: 'string', description: 'Visible label of the ribbon tab to activate (e.g. "Compositor")' },
    },
  },
  async execute({ tabIndex, label }: { tabIndex?: number; label?: string }) {
    if (tabIndex == null && !label) {
      throw new Error('switchRibbonTab requires either tabIndex or label');
    }
    const page = await getPage();
    const clicked = await clickRibbonTab(page, tabIndex, label);
    if (!clicked) {
      throw new Error(
        `Ribbon tab not found (${label ? `label="${label}"` : `index=${tabIndex}`})`,
      );
    }
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
