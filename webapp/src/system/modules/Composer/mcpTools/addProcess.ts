import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  openAddProcessPanel,
  setAddProcessCostMoney,
  setAddProcessCostTime,
  typeAddProcessName,
} from '../components/viewports/ProcessListAccordion/drivers/AddProcessButton.click.puppeteer';
import { waitForProcessItem } from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.click.puppeteer';

const costSchema = z.object({
  quotientAmount: z.number().optional(),
  dividendAmount: z.number().optional(),
});

type AddProcessInput = {
  name: string;
  costTime?: z.infer<typeof costSchema>;
  costMoney?: z.infer<typeof costSchema>;
};

export const addProcessTool = {
  name: 'addProcess',
  description:
    'Create a new process node on the active garment via the Processos accordion (click flow). Optionally set costTime and costMoney amounts; units default to unitário per minuto and reais per unitário.',
  inputSchema: {
    name: z.string().describe('Visible label for the process.'),
    costTime: costSchema.optional(),
    costMoney: costSchema.optional(),
  },
  async execute({ name, costTime, costMoney }: AddProcessInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Processos da Peça');

    await openAddProcessPanel(page);
    await typeAddProcessName(page, name);
    if (costTime) await setAddProcessCostTime(page, costTime);
    if (costMoney) await setAddProcessCostMoney(page, costMoney);

    await confirmPointerPanel(page);
    await waitForProcessItem(page, name);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, name }),
        },
      ],
    };
  },
};
