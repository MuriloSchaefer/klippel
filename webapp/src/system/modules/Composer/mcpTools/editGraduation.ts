import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { clickEditGraduation, clickSaveGraduation, typeEditAmount, typeEditLabel, waitForEditGraduationFormClosed, waitForGraduationItem } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.click.puppeteer';


const GRADUATION_ACCORDION_NAME = 'Graduações da Peça';

type EditGraduationInput = {
  label: string;
  changes: { label?: string; amount?: number };
};

export const editGraduationTool = {
  name: 'editGraduation',
  description:
    'Edit a graduation node identified by its current label. Provide changes.label to rename and/or changes.amount to set the quantity. Saves explicitly to bypass debounce.',
  inputSchema: {
    label: z.string().describe('Current visible label of the graduation.'),
    changes: z
      .object({
        label: z.string().optional(),
        amount: z.number().int().nonnegative().optional(),
      })
      .refine((c) => c.label !== undefined || c.amount !== undefined, {
        message: 'changes must include label and/or amount.',
      }),
  },
  async execute({ label, changes }: EditGraduationInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, GRADUATION_ACCORDION_NAME);

    await waitForGraduationItem(page, label);
    await clickEditGraduation(page, label);

    if (changes.label !== undefined) {
      await typeEditLabel(page, label, changes.label);
    }
    if (changes.amount !== undefined) {
      await typeEditAmount(page, label, changes.amount);
    }

    await clickSaveGraduation(page, label);
    await waitForEditGraduationFormClosed(page);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label, changes }),
        },
      ],
    };
  },
};
