import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '../components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../components/Panels/drivers/Accordion.click.puppeteer';

export const expandAccordionTool = {
  name: 'expandAccordion',
  description:
    'Expand a settings-panel accordion by name (e.g. "Materiais", "Composição"). Ensures the settings panel is expanded first.',
  inputSchema: {
    name: z.string().describe('Accordion name as rendered (e.g. "Materiais").'),
  },
  async execute({ name }: { name: string }) {
    const page = await getPage();
    await page.bringToFront();
    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, name);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, name }) }] };
  },
};
