import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  focusProcessItem,
  setEditProcessCostMoneyFromFocused,
  setEditProcessCostTimeFromFocused,
  triggerEditProcessFromFocused,
  typeEditProcessNameFromFocused,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.shortcut.puppeteer';
import { waitForProcessItem } from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.click.puppeteer';

const costSchema = z.object({
  quotientAmount: z.number().optional(),
  dividendAmount: z.number().optional(),
});

type EditProcessShortcutInput = {
  label: string;
  name?: string;
  costTime?: z.infer<typeof costSchema>;
  costMoney?: z.infer<typeof costSchema>;
};

export const editProcessShortcutTool = {
  name: 'editProcessShortcut',
  description:
    'Edit a process via keyboard: focus the row, press "e", apply changes, Ctrl+Enter to confirm.',
  inputSchema: {
    label: z.string(),
    name: z.string().optional(),
    costTime: costSchema.optional(),
    costMoney: costSchema.optional(),
  },
  async execute({
    label,
    name,
    costTime,
    costMoney,
  }: EditProcessShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Processos da Peça');

    await focusProcessItem(page, label);
    await triggerEditProcessFromFocused(page);

    if (name !== undefined) await typeEditProcessNameFromFocused(page, name);
    if (costTime) await setEditProcessCostTimeFromFocused(page, costTime);
    if (costMoney) await setEditProcessCostMoneyFromFocused(page, costMoney);

    await confirmPointerPanelShortcut(page);

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
