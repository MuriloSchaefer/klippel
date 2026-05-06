import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';
import { clickGarmentTreeItem } from '../components/viewports/CompositionTree/CompositionTree.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
  waitForGarmentDetailsPanelVisible,
} from '../components/viewports/ModelViewport/DetailPanel/GarmentDetails.click.puppeteer';

export const openGarmentDetailsTool = {
  name: 'openGarmentDetails',
  description:
    'Select the garment node and open its details panel via DOM clicks. Ensures the "Detalhes da Peça" accordion is expanded.',
  inputSchema: { type: 'object' as const, properties: {} },
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Composição');
    await clickGarmentTreeItem(page);
    await waitForGarmentDetailsPanelVisible(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
  },
};
