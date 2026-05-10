import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { focusMaterialByLabelMatch } from '../components/viewports/MaterialListAccordion/components/drivers/MaterialItem.shortcut.puppeteer';

type SelectMaterialByLabelInput = { label: string };

export const selectMaterialByLabelTool = {
  name: 'selectMaterialByLabel',
  description:
    'Focus a material row by its visible label. Opens the Materiais accordion if needed. Matches case-insensitively, preferring exact label matches and falling back to substring matches.',
  inputSchema: {
    label: z.string().describe('Visible label of the material to focus.'),
  },
  async execute({ label }: SelectMaterialByLabelInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    const matched = await focusMaterialByLabelMatch(page, label);

    if (!matched) {
      throw new Error(`selectMaterialByLabel: no material row matches "${label}".`);
    }

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, query: label, label: matched }) },
      ],
    };
  },
};
