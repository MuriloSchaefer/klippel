import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  setAddProcessCostMoneyFromFocused,
  setAddProcessCostTimeFromFocused,
  triggerAddProcess,
  typeAddProcessNameFromFocused,
} from '../components/viewports/ProcessListAccordion/drivers/AddProcessButton.shortcut.puppeteer';
import { triggerFocusProcessList } from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.shortcut.puppeteer';
import { waitForProcessItem } from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.click.puppeteer';

const costSchema = z.object({
  quotientAmount: z.number().optional(),
  dividendAmount: z.number().optional(),
});

type AddProcessShortcutInput = {
  name: string;
  costTime?: z.infer<typeof costSchema>;
  costMoney?: z.infer<typeof costSchema>;
};

export const addProcessShortcutTool = {
  name: 'addProcessShortcut',
  description:
    'Create a new process via keyboard: Ctrl+Alt+R focuses the list, "a" opens the panel, type the name, optionally set costs, Ctrl+Enter confirms.',
  inputSchema: {
    name: z.string(),
    costTime: costSchema.optional(),
    costMoney: costSchema.optional(),
  },
  async execute({ name, costTime, costMoney }: AddProcessShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Processos da Peça');

    await triggerFocusProcessList(page);
    await triggerAddProcess(page);
    await typeAddProcessNameFromFocused(page, name);
    if (costTime) await setAddProcessCostTimeFromFocused(page, costTime);
    if (costMoney) await setAddProcessCostMoneyFromFocused(page, costMoney);

    await confirmPointerPanelShortcut(page);
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
