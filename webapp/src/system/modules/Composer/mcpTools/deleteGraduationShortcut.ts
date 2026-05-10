import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { focusGraduationItem, triggerDeleteGraduationFromFocused } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.shortcut.puppeteer';
import { waitForGraduationItemRemoved } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.click.puppeteer';


const GRADUATION_ACCORDION_NAME = 'Graduações da Peça';

type DeleteGraduationShortcutInput = { label: string };

export const deleteGraduationShortcutTool = {
  name: 'deleteGraduationShortcut',
  description: 'Delete a graduation by focusing its row and pressing "d".',
  inputSchema: {
    label: z.string(),
  },
  async execute({ label }: DeleteGraduationShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, GRADUATION_ACCORDION_NAME);

    await focusGraduationItem(page, label);
    await triggerDeleteGraduationFromFocused(page);
    await waitForGraduationItemRemoved(page, label);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, label, deleted: true }) },
      ],
    };
  },
};
