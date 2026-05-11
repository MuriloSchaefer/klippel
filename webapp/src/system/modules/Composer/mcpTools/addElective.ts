import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
} from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  openAddElectivePanel,
  setAddElectiveDefault,
  typeAddElectiveName,
} from '../components/viewports/ElectiveListAccordion/drivers/AddElectiveButton.click.puppeteer';
import { waitForElectiveItem } from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.click.puppeteer';

type AddElectiveInput = {
  name: string;
  isDefault?: boolean;
};

export const addElectiveTool = {
  name: 'addElective',
  description:
    'Create a new elective node on the active garment via the Eletivos accordion (click flow). Optionally mark it as the default.',
  inputSchema: {
    name: z.string().describe('Visible label for the elective.'),
    isDefault: z
      .boolean()
      .optional()
      .describe('Whether this elective should default to on (defaults to false).'),
  },
  async execute({ name, isDefault = false }: AddElectiveInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Eletivos da Peça');

    await openAddElectivePanel(page);
    await typeAddElectiveName(page, name);
    if (isDefault) await setAddElectiveDefault(page, true);

    await confirmPointerPanel(page);
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
