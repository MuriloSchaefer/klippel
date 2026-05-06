import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';
import { clickGarmentTreeItem } from '../components/viewports/CompositionTree/CompositionTree.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
  fillGarmentName,
  waitForGarmentDetailsPanelVisible,
} from '../components/viewports/ModelViewport/DetailPanel/GarmentDetails.click.puppeteer';

const RENAME_DEBOUNCE_MS = 1100;

export const renameGarmentTool = {
  name: 'renameGarment',
  description:
    'Select the garment node, open its details panel, and rename it to {name} via DOM clicks. Waits for the debounced commit before returning.',
  inputSchema: {
    name: z.string().describe('New label for the garment node.'),
  },
  async execute({ name }: { name: string }) {
    const page = await getPage();
    await page.bringToFront();
    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Composição');
    await clickGarmentTreeItem(page);
    await waitForGarmentDetailsPanelVisible(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await fillGarmentName(page, name);
    await new Promise((resolve) => setTimeout(resolve, RENAME_DEBOUNCE_MS));
    await page.keyboard.press('Escape');
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, name }) }] };
  },
};
