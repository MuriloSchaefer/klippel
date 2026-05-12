import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import { focusProcessItem } from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.shortcut.puppeteer';
import {
  triggerLinkElectiveFromFocused,
  selectLinkElectiveOptionByKeyboard,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessElectiveButton.shortcut.puppeteer';
import { waitForProcessLinkedTo } from '../components/viewports/ProcessListAccordion/drivers/ProcessElectiveButton.click.puppeteer';

type LinkProcessElectiveShortcutInput = {
  processLabel: string;
  electiveLabel: string;
};

export const linkProcessElectiveShortcutTool = {
  name: 'linkProcessElectiveShortcut',
  description:
    'Link a process to an elective via keyboard: focus the row, press "w", pick the elective, Ctrl+Enter to confirm.',
  inputSchema: {
    processLabel: z.string(),
    electiveLabel: z.string(),
  },
  async execute({
    processLabel,
    electiveLabel,
  }: LinkProcessElectiveShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Processos da Peça');

    await focusProcessItem(page, processLabel);
    await triggerLinkElectiveFromFocused(page);
    await selectLinkElectiveOptionByKeyboard(page, electiveLabel);
    await confirmPointerPanelShortcut(page);

    await waitForProcessLinkedTo(page, processLabel, electiveLabel);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, processLabel, electiveLabel }),
        },
      ],
    };
  },
};
