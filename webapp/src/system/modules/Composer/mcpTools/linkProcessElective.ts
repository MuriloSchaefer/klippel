import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import { waitForProcessItem } from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.click.puppeteer';
import {
  clickProcessLinkElective,
  selectLinkElectiveOption,
  waitForProcessLinkedTo,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessElectiveButton.click.puppeteer';

type LinkProcessElectiveInput = {
  processLabel: string;
  electiveLabel: string;
};

export const linkProcessElectiveTool = {
  name: 'linkProcessElective',
  description:
    'Link a process node to an elective by label (click flow). Opens the link panel from the process row, selects the elective, and confirms.',
  inputSchema: {
    processLabel: z.string().describe('Label of the process to link.'),
    electiveLabel: z.string().describe('Label of the elective to bind to.'),
  },
  async execute({ processLabel, electiveLabel }: LinkProcessElectiveInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Processos da Peça');

    await waitForProcessItem(page, processLabel);
    await clickProcessLinkElective(page, processLabel);
    await selectLinkElectiveOption(page, electiveLabel);
    await confirmPointerPanel(page);

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
