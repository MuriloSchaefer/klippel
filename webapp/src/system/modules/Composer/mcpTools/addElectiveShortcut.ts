import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  setAddElectiveDefaultShortcut,
  triggerAddElective,
  typeAddElectiveNameFromFocused,
} from '../components/viewports/ElectiveListAccordion/drivers/AddElectiveButton.shortcut.puppeteer';
import { triggerFocusElectiveList } from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.shortcut.puppeteer';
import { waitForElectiveItem } from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.click.puppeteer';

type AddElectiveShortcutInput = {
  name: string;
  isDefault?: boolean;
};

export const addElectiveShortcutTool = {
  name: 'addElectiveShortcut',
  description:
    'Create a new elective node via keyboard: Ctrl+Alt+E focuses the list, "a" opens the panel, type the name, optionally toggle default, Ctrl+Enter to confirm.',
  inputSchema: {
    name: z.string(),
    isDefault: z.boolean().optional(),
  },
  async execute({ name, isDefault = false }: AddElectiveShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Eletivos');

    await triggerFocusElectiveList(page);
    await triggerAddElective(page);
    await typeAddElectiveNameFromFocused(page, name);
    if (isDefault) await setAddElectiveDefaultShortcut(page, true);

    await confirmPointerPanelShortcut(page);
    await waitForElectiveItem(page, name);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, name, isDefault }),
        },
      ],
    };
  },
};
