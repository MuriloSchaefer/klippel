import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';
import {
  clickDeleteMaterial,
  waitForMaterialItem,
  waitForMaterialItemRemoved,
} from '../components/viewports/MaterialListAccordion/components/MaterialItem.click.puppeteer';

type DeleteMaterialInput = { label: string };

export const deleteMaterialTool = {
  name: 'deleteMaterial',
  description:
    'Delete the material node identified by its UI label inside the active Composer ModelViewport.',
  inputSchema: {
    label: z.string().describe('Visible label of the material node to delete.'),
  },
  async execute({ label }: DeleteMaterialInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    await waitForMaterialItem(page, label);
    await clickDeleteMaterial(page, label);
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
