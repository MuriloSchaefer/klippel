import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { clickDeleteGraduation, waitForGraduationItem, waitForGraduationItemRemoved } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.click.puppeteer';


const GRADUATION_ACCORDION_NAME = 'Graduações da Peça';

type DeleteGraduationInput = { label: string };

export const deleteGraduationTool = {
  name: 'deleteGraduation',
  description: 'Delete a graduation node identified by its visible label.',
  inputSchema: {
    label: z.string(),
  },
  async execute({ label }: DeleteGraduationInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, GRADUATION_ACCORDION_NAME);

    await waitForGraduationItem(page, label);
    await clickDeleteGraduation(page, label);
    await waitForGraduationItemRemoved(page, label);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, label, deleted: true }) },
      ],
    };
  },
};
