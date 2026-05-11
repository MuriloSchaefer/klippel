import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
} from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  focusElectiveItem,
  setEditElectiveDefaultShortcut,
  triggerEditElectiveFromFocused,
  typeEditElectiveNameFromFocused,
} from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.shortcut.puppeteer';
import { waitForElectiveItem } from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.click.puppeteer';

type EditElectiveShortcutInput = {
  label: string;
  name?: string;
  isDefault?: boolean;
};

export const editElectiveShortcutTool = {
  name: 'editElectiveShortcut',
  description:
    'Edit an elective node via keyboard: focus the row, press "e", apply changes, Ctrl+Enter to confirm.',
  inputSchema: {
    label: z.string(),
    name: z.string().optional(),
    isDefault: z.boolean().optional(),
  },
  async execute({ label, name, isDefault }: EditElectiveShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Eletivos da Peça');

    await focusElectiveItem(page, label);
    await triggerEditElectiveFromFocused(page);

    if (name !== undefined) await typeEditElectiveNameFromFocused(page, name);
    if (isDefault !== undefined)
      await setEditElectiveDefaultShortcut(page, isDefault);

    await confirmPointerPanelShortcut(page);

    const finalLabel = name ?? label;
    await waitForElectiveItem(page, finalLabel);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label: finalLabel }),
        },
      ],
    };
  },
};
