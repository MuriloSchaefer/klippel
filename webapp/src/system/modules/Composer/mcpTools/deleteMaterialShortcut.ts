import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';

import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';

import { focusMaterialItem, triggerDeleteMaterialFromFocused } from '../components/viewports/MaterialListAccordion/components/drivers/MaterialItem.shortcut.puppeteer';
import { waitForMaterialItemRemoved } from '../components/viewports/MaterialListAccordion/components/drivers/MaterialItem.click.puppeteer';


type DeleteMaterialShortcutInput = { label: string };

export const deleteMaterialShortcutTool = {
  name: 'deleteMaterialShortcut',
  description:
    'Delete a material node by focusing its row and pressing the remove-material shortcut (d).',
  inputSchema: {
    label: z.string().describe('Visible label of the material node to delete.'),
  },
  async execute({ label }: DeleteMaterialShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    await focusMaterialItem(page, label);
    await triggerDeleteMaterialFromFocused(page);
    await waitForMaterialItemRemoved(page, label);

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
