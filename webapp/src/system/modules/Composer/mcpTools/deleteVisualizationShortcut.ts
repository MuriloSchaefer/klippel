import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
} from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import {
  focusVisualizationItem,
  triggerDeleteVisualizationFromFocused,
} from '../components/viewports/VisualizationListAccordion/drivers/VisualizationItem.shortcut.puppeteer';
import { waitForVisualizationItemRemoved } from '../components/viewports/VisualizationListAccordion/drivers/VisualizationItem.click.puppeteer';

type DeleteVisualizationShortcutInput = { label: string };

export const deleteVisualizationShortcutTool = {
  name: 'deleteVisualizationShortcut',
  description:
    'Delete a visualization node by focusing its row and pressing the remove-visualization shortcut (d).',
  inputSchema: {
    label: z.string().describe('Visible label of the visualization node to delete.'),
  },
  async execute({ label }: DeleteVisualizationShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Visualização');

    await focusVisualizationItem(page, label);
    await triggerDeleteVisualizationFromFocused(page);
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
