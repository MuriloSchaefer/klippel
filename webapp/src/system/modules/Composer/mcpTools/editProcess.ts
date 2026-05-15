import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  clickEditProcess,
  setEditProcessCostMoney,
  setEditProcessCostTime,
  typeEditProcessName,
  waitForProcessItem,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.click.puppeteer';

const costSchema = z.object({
  quotientAmount: z.number().optional(),
  dividendAmount: z.number().optional(),
});

const costTimeSchema = costSchema.extend({
  quotientUnit: z.string().optional(),
  dividendUnit: z.string().optional(),
});

type EditProcessInput = {
  label: string;
  name?: string;
  costTime?: z.infer<typeof costTimeSchema>;
  costMoney?: z.infer<typeof costSchema>;
};

export const editProcessTool = {
  name: 'editProcess',
  description:
    'Edit an existing process node by label (click flow). Optionally rename and/or change costTime/costMoney amounts. costTime also accepts quotientUnit/dividendUnit to change the compound units.',
  inputSchema: {
    label: z.string().describe('Current label of the process node to edit.'),
    name: z.string().optional(),
    costTime: costTimeSchema.optional(),
    costMoney: costSchema.optional(),
  },
  async execute({ label, name, costTime, costMoney }: EditProcessInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Processos da Peça');

    await waitForProcessItem(page, label);
    await clickEditProcess(page, label);

    if (name !== undefined) await typeEditProcessName(page, name);
    if (costTime) await setEditProcessCostTime(page, costTime);
    if (costMoney) await setEditProcessCostMoney(page, costMoney);

    await confirmPointerPanel(page);

    const finalLabel = name ?? label;
    await waitForProcessItem(page, finalLabel);

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
