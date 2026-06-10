import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  focusElectiveItem,
  triggerDeleteElectiveFromFocused,
} from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.shortcut.puppeteer';
import { waitForElectiveItemRemoved } from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.click.puppeteer';

type DeleteElectiveShortcutInput = { label: string };

export const deleteElectiveShortcutTool = {
  name: 'deleteElectiveShortcut',
  description:
    'Delete an elective node by focusing its row and pressing the remove-elective shortcut (d).',
  inputSchema: {
    label: z.string().describe('Visible label of the elective node to delete.'),
  },
  async execute({ label }: DeleteElectiveShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Eletivos');

    await focusElectiveItem(page, label);
    await triggerDeleteElectiveFromFocused(page);
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
