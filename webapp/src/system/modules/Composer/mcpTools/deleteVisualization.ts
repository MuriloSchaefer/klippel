import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
} from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import {
  clickDeleteVisualization,
  waitForVisualizationItem,
  waitForVisualizationItemRemoved,
} from '../components/viewports/VisualizationListAccordion/drivers/VisualizationItem.click.puppeteer';

type DeleteVisualizationInput = { label: string };

export const deleteVisualizationTool = {
  name: 'deleteVisualization',
  description:
    'Delete the visualization node identified by its UI label inside the active Composer variation.',
  inputSchema: {
    label: z.string().describe('Visible label of the visualization node to delete.'),
  },
  async execute({ label }: DeleteVisualizationInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Visualização');

    await waitForVisualizationItem(page, label);
    await clickDeleteVisualization(page, label);
    await waitForVisualizationItemRemoved(page, label);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label, deleted: true }),
        },
      ],
    };
  },
};
