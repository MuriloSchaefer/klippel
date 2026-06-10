import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  clickEditElective,
  setEditElectiveDefault,
  typeEditElectiveName,
  waitForElectiveItem,
} from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.click.puppeteer';

type EditElectiveInput = {
  label: string;
  name?: string;
  isDefault?: boolean;
};

export const editElectiveTool = {
  name: 'editElective',
  description:
    'Edit an existing elective node by label (click flow). Optionally rename it and/or change its default flag.',
  inputSchema: {
    label: z.string().describe('Current label of the elective node to edit.'),
    name: z.string().optional(),
    isDefault: z.boolean().optional(),
  },
  async execute({ label, name, isDefault }: EditElectiveInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Eletivos');

    await waitForElectiveItem(page, label);
    await clickEditElective(page, label);

    if (name !== undefined) await typeEditElectiveName(page, name);
    if (isDefault !== undefined) await setEditElectiveDefault(page, isDefault);

    await confirmPointerPanel(page);

    const finalLabel = name ?? label;
    await waitForElectiveItem(page, finalLabel);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            label: finalLabel,
            ...(isDefault !== undefined ? { isDefault } : {}),
          }),
        },
      ],
    };
  },
};
