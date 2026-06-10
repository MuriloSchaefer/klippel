import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  clickDeleteElective,
  waitForElectiveItem,
  waitForElectiveItemRemoved,
} from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.click.puppeteer';

type DeleteElectiveInput = { label: string };

export const deleteElectiveTool = {
  name: 'deleteElective',
  description:
    'Delete the elective node identified by its UI label inside the active Composer variation.',
  inputSchema: {
    label: z.string().describe('Visible label of the elective node to delete.'),
  },
  async execute({ label }: DeleteElectiveInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Eletivos');

    await waitForElectiveItem(page, label);
    await clickDeleteElective(page, label);
    await waitForElectiveItemRemoved(page, label);

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
