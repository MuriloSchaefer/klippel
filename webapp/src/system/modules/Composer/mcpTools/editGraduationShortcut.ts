import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { waitForGraduationItem } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.click.puppeteer';
import { commitEditGraduationFromFocused, focusGraduationItem, triggerEditGraduationFromFocused, typeEditAmountFromFocused, typeEditLabelFromFocused } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.shortcut.puppeteer';


const GRADUATION_ACCORDION_NAME = 'Graduações da Peça';

type EditGraduationShortcutInput = {
  label: string;
  changes: { label?: string; amount?: number };
};

export const editGraduationShortcutTool = {
  name: 'editGraduationShortcut',
  description:
    'Edit a graduation via the keyboard path: focus the row, press "r", type new label/amount, confirm with Enter.',
  inputSchema: {
    label: z.string(),
    changes: z
      .object({
        label: z.string().optional(),
        amount: z.number().int().nonnegative().optional(),
      })
      .refine((c) => c.label !== undefined || c.amount !== undefined, {
        message: 'changes must include label and/or amount.',
      }),
  },
  async execute({ label, changes }: EditGraduationShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, GRADUATION_ACCORDION_NAME);

    await waitForGraduationItem(page, label);
    await focusGraduationItem(page, label);
    await triggerEditGraduationFromFocused(page);

    // Form mounts; label field is autoFocused.
    if (changes.label !== undefined) {
      await typeEditLabelFromFocused(page, changes.label);
    }
    // Tab to amount field if we need to edit it.
    if (changes.amount !== undefined) {
      await page.keyboard.press('Tab');
      await typeEditAmountFromFocused(page, changes.amount);
    }

    await commitEditGraduationFromFocused(page);

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
