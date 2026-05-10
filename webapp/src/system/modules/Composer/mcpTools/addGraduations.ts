import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { clickAddGraduation, typeNamesAndConfirm } from '../components/viewports/GraduationListAccordion/drivers/AddGraduationButton.click.puppeteer';


const GRADUATION_ACCORDION_NAME = 'Graduações da Peça';

type AddGraduationsInput = { names: string[] };

export const addGraduationsTool = {
  name: 'addGraduations',
  description:
    'Add one or more graduation nodes to the active garment via the click path. Names are joined with ", " into the panel text field.',
  inputSchema: {
    names: z.array(z.string().min(1)).min(1).describe('Graduation labels to add, in order.'),
  },
  async execute({ names }: AddGraduationsInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, GRADUATION_ACCORDION_NAME);

    await clickAddGraduation(page);
    await typeNamesAndConfirm(page, names.join(', '));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, names }),
        },
      ],
    };
  },
};
