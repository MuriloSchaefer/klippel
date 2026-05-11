import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import {
  focusProcessItem,
  triggerDeleteProcessFromFocused,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.shortcut.puppeteer';
import { waitForProcessItemRemoved } from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.click.puppeteer';

type DeleteProcessShortcutInput = { label: string };

export const deleteProcessShortcutTool = {
  name: 'deleteProcessShortcut',
  description:
    'Delete a process node by focusing its row and pressing the remove-process shortcut (d).',
  inputSchema: {
    label: z.string().describe('Visible label of the process node to delete.'),
  },
  async execute({ label }: DeleteProcessShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Processos da Peça');

    await focusProcessItem(page, label);
    await triggerDeleteProcessFromFocused(page);
    await waitForProcessItemRemoved(page, label);

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
